import { ERROR_CODES } from "../constants/errorCodes";
import { businessRepository } from "../repository/business.repository";
import { invoiceRepository } from "../repository/invoice.repository";
import { invoiceSettingsRepository } from "../repository/invoice-settings.repository";
import { partyRepository } from "../repository/party.repository";
import type { InvoiceDetail, InvoiceItemRecord, InvoicePdfTemplate, InvoiceRecord } from "../types/invoice";
import { AppError } from "../utils/appError";
import { generateInvoicePdf } from "../utils/invoicePdf";
import { invalidateBusinessFinancialCache } from "./cache.service";
import { downloadPdfFromR2, isR2StorageEnabled, uploadPdfToR2 } from "./storage.service";

const templateMap: Record<string, InvoicePdfTemplate> = {
    default: "bill_pro",
    modern: "modern",
    classic: "classic",
    minimal: "compact",
};

const resolveTemplate = (defaultTemplate?: string | null): InvoicePdfTemplate =>
    templateMap[String(defaultTemplate ?? "default")] || "bill_pro";

const sanitizeFileSegment = (value: string) => value.replace(/[^a-zA-Z0-9-_]/g, "_");

const buildInvoiceDetailForPdf = async (businessId: string, invoiceId: string): Promise<InvoiceDetail> => {
    const invoice = (await invoiceRepository.getInvoiceById(businessId, invoiceId)) as InvoiceRecord | null;
    if (!invoice) {
        throw new AppError("Invoice not found", 404, ERROR_CODES.INVOICE_NOT_FOUND);
    }

    const [items, referenceInvoice, revisedInvoice, referencingInvoices, payments] = await Promise.all([
        invoiceRepository.getInvoiceItems(invoiceId),
        invoice.reference_invoice_id
            ? invoiceRepository.getInvoiceSummary(businessId, String(invoice.reference_invoice_id))
            : Promise.resolve(null),
        invoiceRepository.getFirstReferencingInvoice(businessId, invoiceId),
        invoiceRepository.getReferencingInvoices(businessId, invoiceId),
        invoiceRepository.getInvoicePayments(businessId, invoiceId),
    ]);

    return {
        ...invoice,
        items: items as InvoiceItemRecord[],
        reference_invoice: referenceInvoice,
        revised_invoice: revisedInvoice,
        referencing_invoices: referencingInvoices,
        payments,
    } as InvoiceDetail;
};

const buildObjectKey = (businessId: string, invoiceId: string, invoiceNumber: string, template: InvoicePdfTemplate) =>
    `businesses/${businessId}/invoices/${invoiceId}/${sanitizeFileSegment(invoiceNumber)}-${template}.pdf`;

export const buildInvoicePdfAsset = async (businessId: string, invoiceId: string) => {
    const invoice = await buildInvoiceDetailForPdf(businessId, invoiceId);
    const [business, party, invoiceSettings] = await Promise.all([
        businessRepository.getBusinessById(businessId),
        partyRepository.getPartyById(businessId, String(invoice.party_id)),
        invoiceSettingsRepository.getOrCreate(businessId),
    ]);

    if (!business) {
        throw new AppError("Business not found", 404, ERROR_CODES.NOT_FOUND);
    }

    const template = resolveTemplate(invoiceSettings.default_template);
    const pdfBuffer = await generateInvoicePdf({
        businessName: business.name,
        partyName: party?.name ?? "Party",
        invoice,
        template,
        business: (business as Record<string, unknown>) ?? undefined,
        party: (party as Record<string, unknown> | null) ?? undefined,
    });

    const safeInvoiceNo = sanitizeFileSegment(String(invoice.invoice_number || invoice.id));
    const fileName = `invoice-${safeInvoiceNo}-${template}.pdf`;
    const objectKey = buildObjectKey(businessId, invoiceId, safeInvoiceNo, template);

    return {
        invoice,
        business,
        party,
        template,
        pdfBuffer,
        fileName,
        objectKey,
    };
};

export const ensureInvoicePdfStored = async (
    businessId: string,
    invoiceId: string,
    options: { forceRegenerate?: boolean } = {}
) => {
    if (!isR2StorageEnabled()) {
        throw new AppError(
            "R2 storage is not configured",
            503,
            ERROR_CODES.SERVICE_UNAVAILABLE
        );
    }

    const pdfState = await invoiceRepository.getInvoicePdfState(businessId, invoiceId);
    if (!pdfState) {
        throw new AppError("Invoice not found", 404, ERROR_CODES.INVOICE_NOT_FOUND);
    }

    const invoiceSettings = await invoiceSettingsRepository.getOrCreate(businessId);
    const expectedTemplate = resolveTemplate(invoiceSettings.default_template);

    if (
        !options.forceRegenerate &&
        pdfState.pdf_status === "ready" &&
        pdfState.pdf_object_key &&
        pdfState.pdf_url &&
        pdfState.pdf_template_id === expectedTemplate
    ) {
        return {
            pdf_url: pdfState.pdf_url,
            pdf_object_key: pdfState.pdf_object_key,
            pdf_template_id: pdfState.pdf_template_id,
            pdf_generated_at: pdfState.pdf_generated_at,
        };
    }

    await invoiceRepository.markInvoicePdfProcessing(businessId, invoiceId, expectedTemplate);

    try {
        const asset = await buildInvoicePdfAsset(businessId, invoiceId);
        const uploaded = await uploadPdfToR2(asset.objectKey, asset.pdfBuffer, asset.fileName);
        const generatedAt = new Date().toISOString();

        await invoiceRepository.markInvoicePdfReady(businessId, invoiceId, {
            pdf_url: uploaded.url,
            pdf_object_key: uploaded.key,
            pdf_generated_at: generatedAt,
            pdf_template_id: asset.template,
        });

        await invalidateBusinessFinancialCache(businessId, [invoiceId]);

        return {
            pdf_url: uploaded.url,
            pdf_object_key: uploaded.key,
            pdf_template_id: asset.template,
            pdf_generated_at: generatedAt,
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown PDF generation error";
        await invoiceRepository.markInvoicePdfFailed(businessId, invoiceId, message);
        throw error;
    }
};

export const getStoredInvoicePdfBuffer = async (businessId: string, invoiceId: string) => {
    const pdfState = await invoiceRepository.getInvoicePdfState(businessId, invoiceId);
    if (!pdfState?.pdf_object_key) {
        return null;
    }

    return downloadPdfFromR2(pdfState.pdf_object_key);
};

export const markInvoicePdfPending = async (businessId: string, invoiceId: string) => {
    await invoiceRepository.markInvoicePdfPending(businessId, invoiceId);
    await invalidateBusinessFinancialCache(businessId, [invoiceId]);
};
