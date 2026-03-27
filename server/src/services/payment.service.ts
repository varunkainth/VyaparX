import pool from "../config/db";
import { ERROR_CODES } from "../constants/errorCodes";
import { paymentRepository } from "../repository/payment.repository";
import type { RecordPaymentInput } from "../types/payment_service";
import type { ListPaymentsInput, ReconcilePaymentInput, UnreconcilePaymentInput } from "../types/payment";
import {
    completeIdempotentOperation,
    startIdempotentOperation,
} from "./idempotency.service";
import { AppError } from "../utils/appError";
import { trackAnalyticsEvent } from "./analytics.service";

const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const toCents = (value: number) => Math.round((value + Number.EPSILON) * 100);

export async function recordPayment(data: RecordPaymentInput) {
    const client = await pool.connect();

    try {
        if (!data.business_id || !data.party_id || !data.createdBy) {
            throw new AppError(
                "business_id, party_id and createdBy are required",
                400,
                ERROR_CODES.BAD_REQUEST
            );
        }

        if (!Array.isArray(data.allocations)) {
            throw new AppError("Allocations must be an array", 400, ERROR_CODES.BAD_REQUEST);
        }

        if (data.amount <= 0) {
            throw new AppError("Payment amount must be greater than 0", 400, ERROR_CODES.BAD_REQUEST);
        }

        const totalAllocatedCents = data.allocations.reduce(
            (sum, row) => sum + toCents(row.allocated_amount),
            0
        );
        const paymentAmountCents = toCents(data.amount);

        if (data.allocations.length > 0 && totalAllocatedCents !== paymentAmountCents) {
            throw new AppError("Allocated amount does not match payment amount", 400, ERROR_CODES.BAD_REQUEST);
        }

        await client.query("BEGIN");

        const idempotencyStart = await startIdempotentOperation({
            client,
            businessId: data.business_id,
            action: "record_payment",
            key: data.idempotency_key,
            createdBy: data.createdBy,
        });

        if (!idempotencyStart.shouldExecute) {
            await client.query("COMMIT");
            return idempotencyStart.cachedResponse as { success: boolean; payment_id: string };
        }

        const shouldAutoReconcile = true;
        const bankStatementDate = data.payment_date;
        const autoRef =
            (data.payment_mode === "cash" ? "CASH" : undefined) ??
            data.bank_ref_no ??
            data.upi_ref ??
            data.cheque_no ??
            (data.payment_mode === "card" ? "CARD" : data.payment_mode === "other" ? "OTHER" : undefined);

        const paymentId = await paymentRepository.insertPayment(client, [
            data.business_id,
            data.party_id,
            data.payment_type,
            data.amount,
            data.payment_date,
            data.payment_mode,
            data.upi_ref || null,
            data.cheque_no || null,
            data.cheque_date || null,
            data.bank_account_id || null,
            autoRef || null,
            bankStatementDate || null,
            shouldAutoReconcile,
            shouldAutoReconcile ? new Date().toISOString() : null,
            shouldAutoReconcile ? data.createdBy : null,
            data.notes || null,
            data.createdBy,
        ]);

        for (const allocation of data.allocations) {
            if (allocation.allocated_amount <= 0) {
                throw new AppError("Allocation amount must be greater than 0", 400, ERROR_CODES.BAD_REQUEST);
            }

            const invoice = await paymentRepository.lockInvoiceForPayment(client, allocation.invoice_id);
            if (!invoice) {
                throw new AppError(`Invoice not found: ${allocation.invoice_id}`, 404, ERROR_CODES.INVOICE_NOT_FOUND);
            }

            if (invoice.business_id !== data.business_id) {
                throw new AppError(
                    `Invoice ${allocation.invoice_id} does not belong to this business`,
                    403,
                    ERROR_CODES.BUSINESS_ACCESS_DENIED
                );
            }

            if (invoice.party_id !== data.party_id) {
                throw new AppError(
                    `Invoice ${allocation.invoice_id} does not belong to this party`,
                    400,
                    ERROR_CODES.BAD_REQUEST
                );
            }

            if (invoice.is_cancelled) {
                throw new AppError(
                    `Invoice ${allocation.invoice_id} is cancelled`,
                    409,
                    ERROR_CODES.INVOICE_CANCEL_NOT_ALLOWED
                );
            }

            const currentBalanceDue = Number(invoice.balance_due);
            if (toCents(allocation.allocated_amount) > toCents(currentBalanceDue)) {
                throw new AppError(
                    `Overpayment detected. Allocation exceeds balance_due for invoice ${allocation.invoice_id}`,
                    400,
                    ERROR_CODES.BAD_REQUEST
                );
            }

            await paymentRepository.insertAllocation(
                client,
                paymentId,
                allocation.invoice_id,
                allocation.allocated_amount
            );

            const nextAmountPaid = round2(Number(invoice.amount_paid) + allocation.allocated_amount);
            const nextBalanceDue = round2(currentBalanceDue - allocation.allocated_amount);
            const nextStatus = nextBalanceDue <= 0 ? "paid" : "partial";

            await paymentRepository.updateInvoicePaymentState(
                client,
                allocation.invoice_id,
                nextAmountPaid,
                nextBalanceDue,
                nextStatus
            );
        }

        const ledgerDebit = data.payment_type === "made" ? data.amount : 0;
        const ledgerCredit = data.payment_type === "received" ? data.amount : 0;

        const partyRow = await paymentRepository.lockPartyBalance(client, data.party_id);
        if (!partyRow) {
            throw new AppError("Party not found", 404, ERROR_CODES.PARTY_NOT_FOUND);
        }

        const currentBalance = Number(partyRow.current_balance);
        const newBalance =
            data.payment_type === "received"
                ? round2(currentBalance - data.amount)
                : round2(currentBalance + data.amount);

        await paymentRepository.insertLedgerPayment(client, [
            data.business_id,
            data.party_id,
            ledgerDebit,
            ledgerCredit,
            newBalance,
            "Payment Recorded",
            data.payment_date,
            data.createdBy,
        ]);

        await paymentRepository.updatePartyBalance(client, data.party_id, newBalance);

        if (data.bank_account_id) {
            await paymentRepository.updateBankBalance(
                client,
                data.payment_type,
                data.amount,
                data.bank_account_id
            );
        }

        const response = { success: true, payment_id: paymentId };
        await completeIdempotentOperation({
            client,
            businessId: data.business_id,
            action: "record_payment",
            key: data.idempotency_key,
            response,
        });

        await client.query("COMMIT");

        void trackAnalyticsEvent({
            business_id: data.business_id,
            event_type: "payment_recorded",
            entity_type: "payment",
            entity_id: paymentId,
            actor_user_id: data.createdBy,
            event_data: {
                payment_type: data.payment_type,
                amount: data.amount,
                allocations: data.allocations.length,
            },
        });

        return response;
    } catch (err: any) {
        await client.query("ROLLBACK");
        console.log("Error in Payment Service", err);
        throw err;
    } finally {
        client.release();
    }
}

export async function listPayments(input: ListPaymentsInput) {
    const values: unknown[] = [input.business_id];
    const where: string[] = ["p.business_id = $1"];

    if (input.party_id) {
        values.push(input.party_id);
        where.push(`p.party_id = $${values.length}`);
    }
    if (input.payment_type) {
        values.push(input.payment_type);
        where.push(`p.payment_type = $${values.length}::payment_type`);
    }
    if (input.payment_mode) {
        values.push(input.payment_mode);
        where.push(`p.payment_mode = $${values.length}::payment_mode`);
    }
    if (input.is_reconciled !== undefined) {
        values.push(input.is_reconciled);
        where.push(`p.is_reconciled = $${values.length}`);
    }
    if (input.from_date) {
        values.push(input.from_date);
        where.push(`p.payment_date >= $${values.length}::date`);
    }
    if (input.to_date) {
        values.push(input.to_date);
        where.push(`p.payment_date <= $${values.length}::date`);
    }

    const limit = Math.min(Math.max(input.limit ?? 20, 1), 100);
    const page = Math.max(input.page ?? 1, 1);
    const offset = (page - 1) * limit;

    values.push(limit);
    const limitParam = values.length;
    values.push(offset);
    const offsetParam = values.length;

    const query = `
        SELECT
            p.*,
            pa.name AS party_name,
            COUNT(*) OVER() AS total_count
        FROM payments p
        JOIN parties pa ON pa.id = p.party_id
        WHERE ${where.join(" AND ")}
        ORDER BY p.payment_date DESC, p.created_at DESC
        LIMIT $${limitParam}
        OFFSET $${offsetParam}
    `;

    const result = await paymentRepository.listPayments(query, values);
    const total = result.rows.length > 0 ? Number(result.rows[0].total_count) : 0;
    const items = result.rows.map(({ total_count, ...row }) => row);

    return {
        items,
        pagination: { page, limit, total },
    };
}

export async function getPaymentById(businessId: string, paymentId: string) {
    const payment = await paymentRepository.getPayment(businessId, paymentId);
    if (!payment) {
        throw new AppError("Payment not found", 404, ERROR_CODES.PAYMENT_NOT_FOUND);
    }

    const allocations = await paymentRepository.getAllocations(paymentId);

    return {
        ...payment,
        allocations,
    };
}

export async function reconcilePayment(args: ReconcilePaymentInput) {
    const result = await paymentRepository.reconcile({
        reconciled_by: args.reconciled_by,
        bank_statement_date: args.bank_statement_date ?? null,
        bank_ref_no: args.bank_ref_no ?? null,
        notes: args.notes ?? null,
        business_id: args.business_id,
        payment_id: args.payment_id,
    });

    if (result.rowCount === 1) {
        void trackAnalyticsEvent({
            business_id: args.business_id,
            event_type: "payment_reconciled",
            entity_type: "payment",
            entity_id: args.payment_id,
            actor_user_id: args.reconciled_by,
            event_data: {
                bank_statement_date: args.bank_statement_date ?? null,
                bank_ref_no: args.bank_ref_no ?? null,
                notes: args.notes ?? null,
            },
        });

        return result.rows[0];
    }

    const existing = await paymentRepository.getPaymentState(args.business_id, args.payment_id);
    if (!existing) {
        throw new AppError("Payment not found", 404, ERROR_CODES.PAYMENT_NOT_FOUND);
    }

    throw new AppError("Payment already reconciled", 409, ERROR_CODES.PAYMENT_ALREADY_RECONCILED);
}

export async function unreconcilePayment(args: UnreconcilePaymentInput) {
    const result = await paymentRepository.unreconcile(args.business_id, args.payment_id);

    if (result.rowCount === 1) {
        void trackAnalyticsEvent({
            business_id: args.business_id,
            event_type: "payment_unreconciled",
            entity_type: "payment",
            entity_id: args.payment_id,
            actor_user_id: args.requested_by,
        });

        return result.rows[0];
    }

    const existing = await paymentRepository.getPaymentState(args.business_id, args.payment_id);
    if (!existing) {
        throw new AppError("Payment not found", 404, ERROR_CODES.PAYMENT_NOT_FOUND);
    }

    throw new AppError("Payment is not reconciled", 409, ERROR_CODES.PAYMENT_NOT_RECONCILED);
}
