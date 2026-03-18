import pool from "../config/db";
import type { CreateInvoiceInput, CreateInvoiceNoteInput, InvoiceItemInput } from "../types/invoice_service";
import {
    completeIdempotentOperation,
    startIdempotentOperation,
} from "./idempotency.service";
import { AppError } from "../utils/appError";
import { ERROR_CODES } from "../constants/errorCodes";
import { invoiceRepository } from "../repository/invoice.repository";
import type {
    CancelInvoiceInput,
    ComputedInvoiceItem,
    InvoiceDetail,
    InvoiceItemRecord,
    InvoiceNoteType,
    InvoiceRecord,
    ListInvoicesInput,
    PriceMode,
} from "../types/invoice";
import { trackAnalyticsEvent } from "./analytics.service";
import { handleLowStockTransition, maybeSendLowStockEmail } from "./notification.service";

const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const moneyClose = (left: number, right: number, tolerance = 0.05) =>
    Math.abs(round2(left) - round2(right)) <= tolerance;

const calculateRoundOff = (value: number) => {
    const totalBeforeRounding = round2(value);
    const grandTotal = round2(Math.round(totalBeforeRounding));
    const roundOff = round2(grandTotal - totalBeforeRounding);

    return {
        totalBeforeRounding,
        roundOff,
        grandTotal,
    };
};

const computeInvoiceTotals = (computedItems: ComputedInvoiceItem[]) => {
    const subtotal = round2(computedItems.reduce((sum, row) => sum + row.baseAmount, 0));
    const taxableAmount = round2(computedItems.reduce((sum, row) => sum + row.taxableValue, 0));
    const cgstAmount = round2(computedItems.reduce((sum, row) => sum + row.cgstAmount, 0));
    const sgstAmount = round2(computedItems.reduce((sum, row) => sum + row.sgstAmount, 0));
    const igstAmount = round2(computedItems.reduce((sum, row) => sum + row.igstAmount, 0));
    const totalTax = round2(cgstAmount + sgstAmount + igstAmount);
    const roundedTotals = calculateRoundOff(computedItems.reduce((sum, row) => sum + row.totalAmount, 0));

    return {
        subtotal,
        taxableAmount,
        cgstAmount,
        sgstAmount,
        igstAmount,
        totalTax,
        ...roundedTotals,
    };
};

const deriveFinancialYear = (invoiceDate: string): string => {
    const date = new Date(invoiceDate);
    if (Number.isNaN(date.getTime())) {
        throw new AppError("Invalid invoice_date", 400, ERROR_CODES.BAD_REQUEST);
    }

    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;
    const startYear = month >= 4 ? year : year - 1;
    return `${startYear}-${startYear + 1}`;
};

const deriveInvoiceNumberYear = (invoiceDate: string): string => {
    const date = new Date(invoiceDate);
    if (Number.isNaN(date.getTime())) {
        throw new AppError("Invalid invoice_date", 400, ERROR_CODES.BAD_REQUEST);
    }

    return String(date.getUTCFullYear());
};

const computeLine = (item: InvoiceItemInput, isIgst: boolean): ComputedInvoiceItem => {
    if (item.quantity <= 0) {
        throw new AppError(`Invalid quantity for item ${item.item_name}`, 400, ERROR_CODES.BAD_REQUEST);
    }

    const discountPct = item.discount_pct ?? 0;

    if (item.unit_price < 0 || discountPct < 0 || item.gst_rate < 0) {
        throw new AppError(
            `Invalid pricing/tax values for item ${item.item_name}`,
            400,
            ERROR_CODES.BAD_REQUEST
        );
    }

    const normalizedItem: InvoiceItemInput = {
        ...item,
        unit_price: round2(item.unit_price),
    };

    const priceMode: PriceMode = normalizedItem.price_mode === "inclusive" ? "inclusive" : "exclusive";
    const grossAmount = round2(normalizedItem.quantity * normalizedItem.unit_price);
    const divisor = 1 + normalizedItem.gst_rate / 100;
    const exclusiveBase = priceMode === "inclusive" ? round2(grossAmount / divisor) : grossAmount;
    const discountAmount = round2(exclusiveBase * (discountPct / 100));
    const taxableValue = round2(exclusiveBase - discountAmount);

    const cgstRate = isIgst ? 0 : round2(normalizedItem.gst_rate / 2);
    const sgstRate = isIgst ? 0 : round2(normalizedItem.gst_rate / 2);
    const igstRate = isIgst ? round2(normalizedItem.gst_rate) : 0;

    const cgstAmount = round2((taxableValue * cgstRate) / 100);
    const sgstAmount = round2((taxableValue * sgstRate) / 100);
    const igstAmount = round2((taxableValue * igstRate) / 100);
    const totalAmount = round2(taxableValue + cgstAmount + sgstAmount + igstAmount);

    return {
        price_mode: priceMode,
        item: normalizedItem,
        discountAmount,
        taxableValue,
        cgstRate,
        sgstRate,
        igstRate,
        cgstAmount,
        sgstAmount,
        igstAmount,
        totalAmount,
        baseAmount: exclusiveBase,
    };
};

type NoteEffect = {
    balanceSign: -1 | 1;
    ledgerSide: "debit" | "credit";
    stockDirection: "in" | "out";
    stockMovement: "return_in" | "return_out";
};

const noteEffectMap: Record<"sales" | "purchase", Record<InvoiceNoteType, NoteEffect>> = {
    sales: {
        credit_note: {
            balanceSign: -1,
            ledgerSide: "credit",
            stockDirection: "in",
            stockMovement: "return_in",
        },
        debit_note: {
            balanceSign: 1,
            ledgerSide: "debit",
            stockDirection: "out",
            stockMovement: "return_out",
        },
    },
    purchase: {
        credit_note: {
            balanceSign: 1,
            ledgerSide: "debit",
            stockDirection: "out",
            stockMovement: "return_out",
        },
        debit_note: {
            balanceSign: -1,
            ledgerSide: "credit",
            stockDirection: "in",
            stockMovement: "return_in",
        },
    },
};

const formatNoteDescription = (noteType: InvoiceNoteType, originalInvoiceNumber: string) =>
    `${noteType === "credit_note" ? "Credit note" : "Debit note"} for invoice ${originalInvoiceNumber}`;

export async function createSaleInvoice(data: CreateInvoiceInput) {
    const client = await pool.connect();
    const pendingLowStockEmails: Array<Parameters<typeof maybeSendLowStockEmail>[0]> = [];

    try {
        if (!data?.business_id || !data.party_id || !data.invoice_date || !data.created_by) {
            throw new AppError(
                "business_id, party_id, invoice_date and created_by are required",
                400,
                ERROR_CODES.BAD_REQUEST
            );
        }

        if (!Array.isArray(data.items) || data.items.length === 0) {
            throw new AppError("Invoice must contain at least one item", 400, ERROR_CODES.BAD_REQUEST);
        }

        const financialYear = deriveFinancialYear(data.invoice_date);
        const invoiceNumberYear = deriveInvoiceNumberYear(data.invoice_date);
        const computedItems = data.items.map((item) => computeLine(item, data.is_igst));

        const {
            subtotal,
            taxableAmount,
            cgstAmount,
            sgstAmount,
            igstAmount,
            totalTax,
            roundOff,
            grandTotal,
        } = computeInvoiceTotals(computedItems);

        if (
            !moneyClose(data.subtotal, subtotal) ||
            !moneyClose(data.taxable_amount, taxableAmount) ||
            !moneyClose(data.total_tax, totalTax) ||
            (typeof data.round_off === "number" && !moneyClose(data.round_off, roundOff)) ||
            !moneyClose(data.grand_total, grandTotal)
        ) {
            throw new AppError(
                "Invoice totals mismatch. Please recalculate and retry.",
                400,
                ERROR_CODES.INVOICE_TOTAL_MISMATCH
            );
        }

        await client.query("BEGIN");

        const idempotencyStart = await startIdempotentOperation({
            client,
            businessId: data.business_id,
            action: "create_sales_invoice",
            key: data.idempotency_key,
            createdBy: data.created_by,
        });

        if (!idempotencyStart.shouldExecute) {
            await client.query("COMMIT");
            return idempotencyStart.cachedResponse as { success: boolean; invoice_id: string };
        }

        const sequenceNo = await invoiceRepository.nextInvoiceSequence(
            client,
            data.business_id,
            financialYear,
            "sales"
        );
        const invoiceNumber = `INV-${invoiceNumberYear}-${String(sequenceNo).padStart(3, "0")}`;

        const invoiceId = await invoiceRepository.insertInvoice(client, {
            business_id: data.business_id,
            party_id: data.party_id,
            invoice_type: "sales",
            invoice_number: invoiceNumber,
            financial_year: financialYear,
            invoice_date: data.invoice_date,
            place_of_supply: data.place_of_supply,
            is_igst: data.is_igst,
            subtotal,
            taxable_amount: taxableAmount,
            cgst_amount: cgstAmount,
            sgst_amount: sgstAmount,
            igst_amount: igstAmount,
            total_tax: totalTax,
            round_off: roundOff,
            grand_total: grandTotal,
            payment_status: "unpaid",
            reference_invoice_id: data.reference_invoice_id ?? null,
            created_by: data.created_by,
        });

        for (const row of computedItems) {
            await invoiceRepository.insertInvoiceItem(client, [
                invoiceId,
                row.item.item_id || null,
                row.item.item_name,
                row.item.hsn_code || null,
                row.price_mode,
                row.item.unit,
                row.item.quantity,
                row.item.unit_price,
                row.item.discount_pct ?? 0,
                row.discountAmount,
                row.taxableValue,
                row.item.gst_rate,
                row.cgstRate,
                row.sgstRate,
                row.igstRate,
                row.cgstAmount,
                row.sgstAmount,
                row.igstAmount,
                row.totalAmount,
            ]);

            if (row.item.item_id) {
                const stockRow = await invoiceRepository.lockItemStock(client, row.item.item_id);
                if (!stockRow) {
                    throw new AppError(`Inventory item not found: ${row.item.item_id}`, 404, ERROR_CODES.NOT_FOUND);
                }

                const currentStock = Number(stockRow.current_stock);
                if (row.item.quantity > currentStock) {
                    throw new AppError(
                        `Insufficient stock for item ${row.item.item_name}`,
                        409,
                        ERROR_CODES.STOCK_INSUFFICIENT
                    );
                }

                const nextStock = round2(currentStock - row.item.quantity);
                await invoiceRepository.decrementItemStock(client, row.item.item_id, row.item.quantity);
                await invoiceRepository.insertStockMovement(client, [
                    data.business_id,
                    row.item.item_id,
                    "sale",
                    row.item.quantity,
                    "out",
                    "invoice",
                    invoiceId,
                    data.created_by,
                    null,
                ]);

                const threshold = Number(stockRow.low_stock_threshold ?? 0);
                const lowStockResult = await handleLowStockTransition(
                    {
                        businessId: data.business_id,
                        itemId: row.item.item_id,
                        itemName: String(stockRow.name ?? row.item.item_name),
                        itemUnit: stockRow.unit ? String(stockRow.unit) : null,
                        threshold,
                        previousStock: currentStock,
                        currentStock: nextStock,
                        actorUserId: data.created_by,
                    },
                    client
                );

                if (lowStockResult.shouldSendEmail) {
                    pendingLowStockEmails.push({
                        businessId: data.business_id,
                        itemId: row.item.item_id,
                        itemName: String(stockRow.name ?? row.item.item_name),
                        itemUnit: stockRow.unit ? String(stockRow.unit) : null,
                        threshold,
                        previousStock: currentStock,
                        currentStock: nextStock,
                        actorUserId: data.created_by,
                    });
                }
            }
        }

        const partyRow = await invoiceRepository.lockPartyBalance(client, data.party_id);
        if (!partyRow) {
            throw new AppError("Party not found", 404, ERROR_CODES.PARTY_NOT_FOUND);
        }

        const currentBalance = Number(partyRow.current_balance);
        const newBalance = round2(currentBalance + grandTotal);

        await invoiceRepository.insertLedgerEntry(client, [
            data.business_id,
            data.party_id,
            "invoice",
            grandTotal,
            0,
            newBalance,
            "invoice",
            invoiceId,
            "Sales Invoice Created",
            data.invoice_date,
            data.created_by,
        ]);
        await invoiceRepository.updatePartyBalance(client, data.party_id, newBalance);

        const response = { success: true, invoice_id: invoiceId };
        await completeIdempotentOperation({
            client,
            businessId: data.business_id,
            action: "create_sales_invoice",
            key: data.idempotency_key,
            response,
        });

        await client.query("COMMIT");

        await Promise.all(
            pendingLowStockEmails.map((context) => maybeSendLowStockEmail(context, true))
        );

        void trackAnalyticsEvent({
            business_id: data.business_id,
            event_type: "invoice_created",
            entity_type: "invoice",
            entity_id: invoiceId,
            actor_user_id: data.created_by,
            event_data: {
                invoice_number: invoiceNumber,
                party_id: data.party_id,
                grand_total: grandTotal,
                item_count: computedItems.length,
                invoice_type: "sales",
                uses_inclusive_price: computedItems.some((item) => item.price_mode === "inclusive"),
            },
        });

        return response;
    } catch (err: any) {
        await client.query("ROLLBACK");
        console.error("Error in Invoice Service", err);

        if (err.code === "23505" && err.constraint === "invoices_business_id_invoice_number_key") {
            throw new AppError(
                "Invoice number already exists. This might be a duplicate request.",
                409,
                ERROR_CODES.DUPLICATE_RESOURCE
            );
        }

        throw err;
    } finally {
        client.release();
    }
}

export async function createPurchaseInvoice(data: CreateInvoiceInput) {
    const client = await pool.connect();
    const pendingLowStockEmails: Array<Parameters<typeof maybeSendLowStockEmail>[0]> = [];

    try {
        if (!data?.business_id || !data.party_id || !data.invoice_date || !data.created_by) {
            throw new AppError(
                "business_id, party_id, invoice_date and created_by are required",
                400,
                ERROR_CODES.BAD_REQUEST
            );
        }

        if (!Array.isArray(data.items) || data.items.length === 0) {
            throw new AppError("Invoice must contain at least one item", 400, ERROR_CODES.BAD_REQUEST);
        }

        const financialYear = deriveFinancialYear(data.invoice_date);
        const invoiceNumberYear = deriveInvoiceNumberYear(data.invoice_date);
        const computedItems = data.items.map((item) => computeLine(item, data.is_igst));

        const {
            subtotal,
            taxableAmount,
            cgstAmount,
            sgstAmount,
            igstAmount,
            totalTax,
            roundOff,
            grandTotal,
        } = computeInvoiceTotals(computedItems);

        if (
            !moneyClose(data.subtotal, subtotal) ||
            !moneyClose(data.taxable_amount, taxableAmount) ||
            !moneyClose(data.total_tax, totalTax) ||
            (typeof data.round_off === "number" && !moneyClose(data.round_off, roundOff)) ||
            !moneyClose(data.grand_total, grandTotal)
        ) {
            throw new AppError(
                "Invoice totals mismatch. Please recalculate and retry.",
                400,
                ERROR_CODES.INVOICE_TOTAL_MISMATCH
            );
        }

        await client.query("BEGIN");

        const idempotencyStart = await startIdempotentOperation({
            client,
            businessId: data.business_id,
            action: "create_purchase_invoice",
            key: data.idempotency_key,
            createdBy: data.created_by,
        });

        if (!idempotencyStart.shouldExecute) {
            await client.query("COMMIT");
            return idempotencyStart.cachedResponse as { success: boolean; invoice_id: string };
        }

        const sequenceNo = await invoiceRepository.nextInvoiceSequence(
            client,
            data.business_id,
            financialYear,
            "purchase"
        );
        const invoiceNumber = `PINV-${invoiceNumberYear}-${String(sequenceNo).padStart(3, "0")}`;

        const invoiceId = await invoiceRepository.insertInvoice(client, {
            business_id: data.business_id,
            party_id: data.party_id,
            invoice_type: "purchase",
            invoice_number: invoiceNumber,
            financial_year: financialYear,
            invoice_date: data.invoice_date,
            place_of_supply: data.place_of_supply,
            is_igst: data.is_igst,
            subtotal,
            taxable_amount: taxableAmount,
            cgst_amount: cgstAmount,
            sgst_amount: sgstAmount,
            igst_amount: igstAmount,
            total_tax: totalTax,
            round_off: roundOff,
            grand_total: grandTotal,
            payment_status: "unpaid",
            reference_invoice_id: data.reference_invoice_id ?? null,
            created_by: data.created_by,
        });

        for (const row of computedItems) {
            await invoiceRepository.insertInvoiceItem(client, [
                invoiceId,
                row.item.item_id || null,
                row.item.item_name,
                row.item.hsn_code || null,
                row.price_mode,
                row.item.unit,
                row.item.quantity,
                row.item.unit_price,
                row.item.discount_pct ?? 0,
                row.discountAmount,
                row.taxableValue,
                row.item.gst_rate,
                row.cgstRate,
                row.sgstRate,
                row.igstRate,
                row.cgstAmount,
                row.sgstAmount,
                row.igstAmount,
                row.totalAmount,
            ]);

            if (row.item.item_id) {
                const stockRow = await invoiceRepository.lockItemStock(client, row.item.item_id);
                if (!stockRow) {
                    throw new AppError(`Inventory item not found: ${row.item.item_id}`, 404, ERROR_CODES.NOT_FOUND);
                }

                const currentStock = Number(stockRow.current_stock);
                const nextStock = round2(currentStock + row.item.quantity);
                await invoiceRepository.incrementItemStock(client, row.item.item_id, row.item.quantity);
                await invoiceRepository.insertStockMovement(client, [
                    data.business_id,
                    row.item.item_id,
                    "purchase",
                    row.item.quantity,
                    "in",
                    "invoice",
                    invoiceId,
                    data.created_by,
                    row.item.item_name,
                ]);

                const threshold = Number(stockRow.low_stock_threshold ?? 0);
                const lowStockResult = await handleLowStockTransition(
                    {
                        businessId: data.business_id,
                        itemId: row.item.item_id,
                        itemName: String(stockRow.name ?? row.item.item_name),
                        itemUnit: stockRow.unit ? String(stockRow.unit) : null,
                        threshold,
                        previousStock: currentStock,
                        currentStock: nextStock,
                        actorUserId: data.created_by,
                    },
                    client
                );

                if (lowStockResult.shouldSendEmail) {
                    pendingLowStockEmails.push({
                        businessId: data.business_id,
                        itemId: row.item.item_id,
                        itemName: String(stockRow.name ?? row.item.item_name),
                        itemUnit: stockRow.unit ? String(stockRow.unit) : null,
                        threshold,
                        previousStock: currentStock,
                        currentStock: nextStock,
                        actorUserId: data.created_by,
                    });
                }
            }
        }

        const partyRow = await invoiceRepository.lockPartyBalance(client, data.party_id);
        if (!partyRow) {
            throw new AppError("Party not found", 404, ERROR_CODES.PARTY_NOT_FOUND);
        }

        const currentBalance = Number(partyRow.current_balance);
        const newBalance = round2(currentBalance - grandTotal);

        await invoiceRepository.insertLedgerEntry(client, [
            data.business_id,
            data.party_id,
            "invoice",
            0,
            grandTotal,
            newBalance,
            "invoice",
            invoiceId,
            "Purchase Invoice Created",
            data.invoice_date,
            data.created_by,
        ]);
        await invoiceRepository.updatePartyBalance(client, data.party_id, newBalance);

        const response = { success: true, invoice_id: invoiceId };
        await completeIdempotentOperation({
            client,
            businessId: data.business_id,
            action: "create_purchase_invoice",
            key: data.idempotency_key,
            response,
        });

        await client.query("COMMIT");

        await Promise.all(
            pendingLowStockEmails.map((context) => maybeSendLowStockEmail(context, true))
        );

        void trackAnalyticsEvent({
            business_id: data.business_id,
            event_type: "invoice_created",
            entity_type: "invoice",
            entity_id: invoiceId,
            actor_user_id: data.created_by,
            event_data: {
                invoice_number: invoiceNumber,
                party_id: data.party_id,
                grand_total: grandTotal,
                item_count: computedItems.length,
                invoice_type: "purchase",
                uses_inclusive_price: computedItems.some((item) => item.price_mode === "inclusive"),
            },
        });

        return response;
    } catch (err: any) {
        await client.query("ROLLBACK");
        console.error("Error in Purchase Invoice Service", err);

        if (err.code === "23505" && err.constraint === "invoices_business_id_invoice_number_key") {
            throw new AppError(
                "Invoice number already exists. This might be a duplicate request.",
                409,
                ERROR_CODES.DUPLICATE_RESOURCE
            );
        }

        throw err;
    } finally {
        client.release();
    }
}

export async function createInvoiceNote(data: CreateInvoiceNoteInput) {
    const client = await pool.connect();
    const pendingLowStockEmails: Array<Parameters<typeof maybeSendLowStockEmail>[0]> = [];

    try {
        if (!data?.business_id || !data.party_id || !data.invoice_date || !data.created_by) {
            throw new AppError(
                "business_id, party_id, invoice_date and created_by are required",
                400,
                ERROR_CODES.BAD_REQUEST
            );
        }

        if (!data.reference_invoice_id) {
            throw new AppError("Reference invoice is required", 400, ERROR_CODES.BAD_REQUEST);
        }

        if (!Array.isArray(data.items) || data.items.length === 0) {
            throw new AppError("Invoice notes must contain at least one item", 400, ERROR_CODES.BAD_REQUEST);
        }

        const referenceInvoice = await invoiceRepository.getInvoiceById(
            data.business_id,
            data.reference_invoice_id
        );
        if (!referenceInvoice) {
            throw new AppError("Reference invoice not found", 404, ERROR_CODES.INVOICE_NOT_FOUND);
        }

        if (referenceInvoice.invoice_type !== "sales" && referenceInvoice.invoice_type !== "purchase") {
            throw new AppError("Reference invoice cannot have credit/debit notes", 400, ERROR_CODES.BAD_REQUEST);
        }

        const financialYear = deriveFinancialYear(data.invoice_date);
        const invoiceNumberYear = deriveInvoiceNumberYear(data.invoice_date);
        const computedItems = data.items.map((item) => computeLine(item, data.is_igst));

        const {
            subtotal,
            taxableAmount,
            cgstAmount,
            sgstAmount,
            igstAmount,
            totalTax,
            roundOff,
            grandTotal,
        } = computeInvoiceTotals(computedItems);

        if (
            !moneyClose(data.subtotal, subtotal) ||
            !moneyClose(data.taxable_amount, taxableAmount) ||
            !moneyClose(data.total_tax, totalTax) ||
            (typeof data.round_off === "number" && !moneyClose(data.round_off, roundOff)) ||
            !moneyClose(data.grand_total, grandTotal)
        ) {
            throw new AppError(
                "Invoice totals mismatch. Please recalculate and retry.",
                400,
                ERROR_CODES.INVOICE_TOTAL_MISMATCH
            );
        }

        await client.query("BEGIN");

        const idempotencyStart = await startIdempotentOperation({
            client,
            businessId: data.business_id,
            action: "create_invoice_note",
            key: data.idempotency_key,
            createdBy: data.created_by,
        });

        if (!idempotencyStart.shouldExecute) {
            await client.query("COMMIT");
            return idempotencyStart.cachedResponse as { success: boolean; invoice_id: string };
        }

        // Credit notes use sales sequence, debit notes use purchase sequence
        const sequenceType = data.note_type === "credit_note" ? "sales" : "purchase";
        const sequenceNo = await invoiceRepository.nextInvoiceSequence(
            client,
            data.business_id,
            financialYear,
            sequenceType
        );
        const prefix = data.note_type === "credit_note" ? "CN" : "DN";
        const invoiceNumber = `${prefix}-${invoiceNumberYear}-${String(sequenceNo).padStart(3, "0")}`;

        const invoiceId = await invoiceRepository.insertInvoice(client, {
            business_id: data.business_id,
            party_id: data.party_id,
            invoice_type: sequenceType,
            invoice_number: invoiceNumber,
            financial_year: financialYear,
            invoice_date: data.invoice_date,
            place_of_supply: data.place_of_supply,
            is_igst: data.is_igst,
            subtotal,
            taxable_amount: taxableAmount,
            cgst_amount: cgstAmount,
            sgst_amount: sgstAmount,
            igst_amount: igstAmount,
            total_tax: totalTax,
            round_off: roundOff,
            grand_total: grandTotal,
            payment_status: "unpaid",
            reference_invoice_id: data.reference_invoice_id,
            note_reason: data.note_reason,
            created_by: data.created_by,
        });

        const effect = noteEffectMap[referenceInvoice.invoice_type as "sales" | "purchase"][data.note_type];
        const ledgerDebit = effect.ledgerSide === "debit" ? grandTotal : 0;
        const ledgerCredit = effect.ledgerSide === "credit" ? grandTotal : 0;

        for (const row of computedItems) {
            await invoiceRepository.insertInvoiceItem(client, [
                invoiceId,
                row.item.item_id || null,
                row.item.item_name,
                row.item.hsn_code || null,
                row.price_mode,
                row.item.unit,
                row.item.quantity,
                row.item.unit_price,
                row.item.discount_pct ?? 0,
                row.discountAmount,
                row.taxableValue,
                row.item.gst_rate,
                row.cgstRate,
                row.sgstRate,
                row.igstRate,
                row.cgstAmount,
                row.sgstAmount,
                row.igstAmount,
                row.totalAmount,
            ]);

            if (row.item.item_id) {
                const stockRow = await invoiceRepository.lockItemStock(client, row.item.item_id);
                if (!stockRow) {
                    throw new AppError(`Inventory item not found: ${row.item.item_id}`, 404, ERROR_CODES.NOT_FOUND);
                }

                if (effect.stockDirection === "in") {
                    await invoiceRepository.incrementItemStock(client, row.item.item_id, row.item.quantity);
                } else {
                    const currentStock = Number(stockRow.current_stock);
                    if (row.item.quantity > currentStock) {
                        throw new AppError(
                            `Insufficient stock for item ${row.item.item_name}`,
                            409,
                            ERROR_CODES.STOCK_INSUFFICIENT
                        );
                    }
                    await invoiceRepository.decrementItemStock(client, row.item.item_id, row.item.quantity);
                }

                const previousStock = Number(stockRow.current_stock);
                const nextStock =
                    effect.stockDirection === "in"
                        ? round2(previousStock + row.item.quantity)
                        : round2(previousStock - row.item.quantity);

                await invoiceRepository.insertStockMovement(client, [
                    data.business_id,
                    row.item.item_id,
                    effect.stockMovement,
                    row.item.quantity,
                    effect.stockDirection,
                    "invoice",
                    invoiceId,
                    data.created_by,
                    data.note_reason ?? `${data.note_type} generated`,
                ]);

                const threshold = Number(stockRow.low_stock_threshold ?? 0);
                const lowStockResult = await handleLowStockTransition(
                    {
                        businessId: data.business_id,
                        itemId: row.item.item_id,
                        itemName: String(stockRow.name ?? row.item.item_name),
                        itemUnit: stockRow.unit ? String(stockRow.unit) : null,
                        threshold,
                        previousStock,
                        currentStock: nextStock,
                        actorUserId: data.created_by,
                    },
                    client
                );

                if (lowStockResult.shouldSendEmail) {
                    pendingLowStockEmails.push({
                        businessId: data.business_id,
                        itemId: row.item.item_id,
                        itemName: String(stockRow.name ?? row.item.item_name),
                        itemUnit: stockRow.unit ? String(stockRow.unit) : null,
                        threshold,
                        previousStock,
                        currentStock: nextStock,
                        actorUserId: data.created_by,
                    });
                }
            }
        }

        const partyRow = await invoiceRepository.lockPartyBalance(client, data.party_id);
        if (!partyRow) {
            throw new AppError("Party not found", 404, ERROR_CODES.PARTY_NOT_FOUND);
        }

        const currentBalance = Number(partyRow.current_balance);
        const newBalance = round2(currentBalance + effect.balanceSign * grandTotal);

        await invoiceRepository.insertLedgerEntry(client, [
            data.business_id,
            data.party_id,
            "invoice",
            ledgerDebit,
            ledgerCredit,
            newBalance,
            "invoice",
            invoiceId,
            formatNoteDescription(data.note_type, referenceInvoice.invoice_number),
            data.invoice_date,
            data.created_by,
        ]);
        await invoiceRepository.updatePartyBalance(client, data.party_id, newBalance);

        const response = { success: true, invoice_id: invoiceId };
        await completeIdempotentOperation({
            client,
            businessId: data.business_id,
            action: "create_invoice_note",
            key: data.idempotency_key,
            response,
        });

        await client.query("COMMIT");

        await Promise.all(
            pendingLowStockEmails.map((context) => maybeSendLowStockEmail(context, true))
        );

        void trackAnalyticsEvent({
            business_id: data.business_id,
            event_type: "invoice_created",
            entity_type: "invoice",
            entity_id: invoiceId,
            actor_user_id: data.created_by,
            event_data: {
                invoice_number: invoiceNumber,
                party_id: data.party_id,
                grand_total: grandTotal,
                item_count: computedItems.length,
                invoice_type: data.note_type,
            },
        });

        return response;
    } catch (err: any) {
        await client.query("ROLLBACK");
        console.error("Error in Invoice Note Service", err);

        if (err.code === "23505" && err.constraint === "invoices_business_id_invoice_number_key") {
            throw new AppError(
                "Invoice number already exists. This might be a duplicate request.",
                409,
                ERROR_CODES.DUPLICATE_RESOURCE
            );
        }

        throw err;
    } finally {
        client.release();
    }
}

export async function listInvoices(input: ListInvoicesInput) {
    const values: unknown[] = [input.business_id];
    const where: string[] = ["business_id = $1"];

    if (!input.include_cancelled) {
        where.push("is_cancelled = false");
    }
    if (input.party_id) {
        values.push(input.party_id);
        where.push(`party_id = $${values.length}`);
    }
    if (input.payment_status) {
        values.push(input.payment_status);
        where.push(`payment_status = $${values.length}::payment_status`);
    }
    if (input.invoice_type) {
        values.push(input.invoice_type);
        where.push(`invoice_type = $${values.length}::invoice_type`);
    }
    if (input.from_date) {
        values.push(input.from_date);
        where.push(`invoice_date >= $${values.length}::date`);
    }
    if (input.to_date) {
        values.push(input.to_date);
        where.push(`invoice_date <= $${values.length}::date`);
    }
    if (input.search) {
        values.push(`%${input.search}%`);
        where.push(`invoice_number ILIKE $${values.length}`);
    }

    const limit = Math.min(Math.max(input.limit ?? 20, 1), 100);
    const page = Math.max(input.page ?? 1, 1);
    const offset = (page - 1) * limit;

    values.push(limit);
    const limitParam = values.length;
    values.push(offset);
    const offsetParam = values.length;

    const query = `
        SELECT *,
               COUNT(*) OVER() AS total_count
        FROM invoices
        WHERE ${where.join(" AND ")}
        ORDER BY invoice_date DESC, created_at DESC
        LIMIT $${limitParam}
        OFFSET $${offsetParam}
    `;

    const result = await invoiceRepository.listInvoices(query, values);
    const total = result.rows.length > 0 ? Number(result.rows[0].total_count) : 0;
    const invoices = result.rows.map(({ total_count, ...row }) => row);

    return {
        items: invoices,
        pagination: { page, limit, total },
    };
}

export async function getInvoiceById(businessId: string, invoiceId: string) {
    const invoice = (await invoiceRepository.getInvoiceById(businessId, invoiceId)) as InvoiceRecord | null;
    if (!invoice) {
        throw new AppError("Invoice not found", 404, ERROR_CODES.INVOICE_NOT_FOUND);
    }

    const [items, referenceInvoice, revisedInvoice] = await Promise.all([
        invoiceRepository.getInvoiceItems(invoiceId),
        invoice.reference_invoice_id
            ? invoiceRepository.getInvoiceSummary(businessId, invoice.reference_invoice_id)
            : Promise.resolve(null),
        invoiceRepository.getFirstReferencingInvoice(businessId, invoiceId),
    ]);

    return {
        ...invoice,
        items: items as InvoiceItemRecord[],
        reference_invoice: referenceInvoice,
        revised_invoice: revisedInvoice,
    } as InvoiceDetail;
}

export async function cancelInvoice(args: CancelInvoiceInput) {
    const client = await pool.connect();
    const pendingLowStockEmails: Array<Parameters<typeof maybeSendLowStockEmail>[0]> = [];
    try {
        await client.query("BEGIN");

        const invoice = await invoiceRepository.lockInvoiceForCancel(client, args.business_id, args.invoice_id);
        if (!invoice) {
            throw new AppError("Invoice not found", 404, ERROR_CODES.INVOICE_NOT_FOUND);
        }
        if (invoice.is_cancelled) {
            throw new AppError("Invoice already cancelled", 409, ERROR_CODES.INVOICE_ALREADY_CANCELLED);
        }

        if (Number(invoice.amount_paid) > 0) {
            throw new AppError(
                "Paid/partially paid invoice cannot be cancelled",
                409,
                ERROR_CODES.INVOICE_CANCEL_NOT_ALLOWED
            );
        }

        if (invoice.invoice_type === "sales") {
            const items = await invoiceRepository.getInvoiceItemsForCancel(client, args.invoice_id);

            for (const row of items) {
                if (!row.item_id) continue;

                const locked = await invoiceRepository.lockItemStock(client, row.item_id);
                if (!locked) {
                    throw new AppError(`Inventory item not found: ${row.item_id}`, 404, ERROR_CODES.NOT_FOUND);
                }

                await client.query(
                    `UPDATE inventory_items SET current_stock = current_stock + $1, updated_at = now() WHERE id = $2`,
                    [Number(row.quantity), row.item_id]
                );
                await invoiceRepository.insertStockMovement(client, [
                    args.business_id,
                    row.item_id,
                    "adjustment",
                    Number(row.quantity),
                    "in",
                    "invoice",
                    args.invoice_id,
                    args.cancelled_by,
                    args.cancel_reason || "Invoice cancelled",
                ]);

                const previousStock = Number(locked.current_stock);
                const nextStock = round2(previousStock + Number(row.quantity));
                const threshold = Number(locked.low_stock_threshold ?? 0);
                const lowStockResult = await handleLowStockTransition(
                    {
                        businessId: args.business_id,
                        itemId: row.item_id,
                        itemName: String(locked.name ?? row.item_name),
                        itemUnit: locked.unit ? String(locked.unit) : null,
                        threshold,
                        previousStock,
                        currentStock: nextStock,
                        actorUserId: args.cancelled_by,
                    },
                    client
                );

                if (lowStockResult.shouldSendEmail) {
                    pendingLowStockEmails.push({
                        businessId: args.business_id,
                        itemId: row.item_id,
                        itemName: String(locked.name ?? row.item_name),
                        itemUnit: locked.unit ? String(locked.unit) : null,
                        threshold,
                        previousStock,
                        currentStock: nextStock,
                        actorUserId: args.cancelled_by,
                    });
                }
            }

            const partyRow = await invoiceRepository.lockPartyBalance(client, invoice.party_id);
            if (!partyRow) {
                throw new AppError("Party not found", 404, ERROR_CODES.PARTY_NOT_FOUND);
            }

            const currentBalance = Number(partyRow.current_balance);
            const newBalance = round2(currentBalance - Number(invoice.grand_total));

            await invoiceRepository.insertLedgerEntry(client, [
                args.business_id,
                invoice.party_id,
                "adjustment",
                0,
                Number(invoice.grand_total),
                newBalance,
                "invoice",
                args.invoice_id,
                `Invoice ${invoice.invoice_number} cancelled`,
                invoice.invoice_date,
                args.cancelled_by,
            ]);
            await invoiceRepository.updatePartyBalance(client, invoice.party_id, newBalance);
        } else if (invoice.invoice_type === "purchase") {
            const items = await invoiceRepository.getInvoiceItemsForCancel(client, args.invoice_id);

            for (const row of items) {
                if (!row.item_id) continue;

                const locked = await invoiceRepository.lockItemStock(client, row.item_id);
                if (!locked) {
                    throw new AppError(`Inventory item not found: ${row.item_id}`, 404, ERROR_CODES.NOT_FOUND);
                }

                await invoiceRepository.decrementItemStock(client, row.item_id, Number(row.quantity));
                await invoiceRepository.insertStockMovement(client, [
                    args.business_id,
                    row.item_id,
                    "adjustment",
                    Number(row.quantity),
                    "out",
                    "invoice",
                    args.invoice_id,
                    args.cancelled_by,
                    args.cancel_reason || "Purchase invoice cancelled",
                ]);

                const previousStock = Number(locked.current_stock);
                const nextStock = round2(previousStock - Number(row.quantity));
                const threshold = Number(locked.low_stock_threshold ?? 0);
                const lowStockResult = await handleLowStockTransition(
                    {
                        businessId: args.business_id,
                        itemId: row.item_id,
                        itemName: String(locked.name ?? row.item_name),
                        itemUnit: locked.unit ? String(locked.unit) : null,
                        threshold,
                        previousStock,
                        currentStock: nextStock,
                        actorUserId: args.cancelled_by,
                    },
                    client
                );

                if (lowStockResult.shouldSendEmail) {
                    pendingLowStockEmails.push({
                        businessId: args.business_id,
                        itemId: row.item_id,
                        itemName: String(locked.name ?? row.item_name),
                        itemUnit: locked.unit ? String(locked.unit) : null,
                        threshold,
                        previousStock,
                        currentStock: nextStock,
                        actorUserId: args.cancelled_by,
                    });
                }
            }

            const partyRow = await invoiceRepository.lockPartyBalance(client, invoice.party_id);
            if (!partyRow) {
                throw new AppError("Party not found", 404, ERROR_CODES.PARTY_NOT_FOUND);
            }

            const currentBalance = Number(partyRow.current_balance);
            const newBalance = round2(currentBalance + Number(invoice.grand_total));

            await invoiceRepository.insertLedgerEntry(client, [
                args.business_id,
                invoice.party_id,
                "adjustment",
                Number(invoice.grand_total),
                0,
                newBalance,
                "invoice",
                args.invoice_id,
                `Purchase Invoice ${invoice.invoice_number} cancelled`,
                invoice.invoice_date,
                args.cancelled_by,
            ]);
            await invoiceRepository.updatePartyBalance(client, invoice.party_id, newBalance);
        }

        await invoiceRepository.markCancelled(client, args.cancelled_by, args.cancel_reason ?? null, args.invoice_id);

        await client.query("COMMIT");

        await Promise.all(
            pendingLowStockEmails.map((context) => maybeSendLowStockEmail(context, true))
        );

        void trackAnalyticsEvent({
            business_id: args.business_id,
            event_type: "invoice_cancelled",
            entity_type: "invoice",
            entity_id: args.invoice_id,
            actor_user_id: args.cancelled_by,
            event_data: {
                invoice_number: invoice.invoice_number,
                cancel_reason: args.cancel_reason ?? null,
                invoice_type: invoice.invoice_type,
            },
        });

        return { success: true, invoice_id: args.invoice_id, is_cancelled: true };
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
}
