import type { Request, Response } from "express";
import { emailService } from "../config/email";
import { invoiceRepository } from "../repository/invoice.repository";
import { businessRepository } from "../repository/business.repository";
import { partyRepository } from "../repository/party.repository";
import { invoiceSettingsRepository } from "../repository/invoice-settings.repository";
import { generateInvoicePdf } from "../utils/invoicePdf";
import type { InvoicePdfTemplate } from "../types/invoice";
import { sendSuccess } from "../utils/responseHandler";
import { AppError } from "../utils/appError";
import { ERROR_CODES } from "../constants/errorCodes";

interface SendInvoiceEmailRequest {
    business_id: string;
    invoice_id: string;
}

interface SendInvoiceEmailBody {
    recipient_email: string;
}

export async function sendInvoiceEmailHandler(
    req: Request<SendInvoiceEmailRequest, {}, SendInvoiceEmailBody>,
    res: Response
) {
    const { business_id, invoice_id } = req.params;
    const { recipient_email } = req.body;

    // Check if email service is configured
    if (!emailService.isReady()) {
        throw new AppError(
            "Email service is not configured. Please contact administrator.",
            503,
            ERROR_CODES.BAD_REQUEST
        );
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipient_email)) {
        throw new AppError(
            "Invalid email address",
            400,
            ERROR_CODES.BAD_REQUEST
        );
    }

    // Get invoice and items
    const [invoice, items] = await Promise.all([
        invoiceRepository.getInvoiceById(business_id, invoice_id),
        invoiceRepository.getInvoiceItems(invoice_id),
    ]);
    
    if (!invoice) {
        throw new AppError(
            "Invoice not found",
            404,
            ERROR_CODES.INVOICE_NOT_FOUND
        );
    }

    // Attach items to invoice
    const invoiceWithItems = {
        ...invoice,
        items,
    };

    // Get business, party, and invoice settings
    const [business, party, invoiceSettings] = await Promise.all([
        businessRepository.getBusinessForUser(business_id, req.user!.id),
        partyRepository.getPartyById(business_id, String(invoice.party_id)),
        invoiceSettingsRepository.getOrCreate(business_id),
    ]);

    if (!business) {
        throw new AppError(
            "Business not found",
            404,
            ERROR_CODES.NOT_FOUND
        );
    }

    // Map database template names to PDF template names
    const templateMap: Record<string, InvoicePdfTemplate> = {
        default: "bill_pro",
        modern: "modern",
        classic: "classic",
        minimal: "compact",
    };

    const template = templateMap[invoiceSettings.default_template] || "bill_pro";

    // Generate PDF
    const pdfBuffer = await generateInvoicePdf({
        businessName: business.name,
        partyName: party?.name ?? "Customer",
        invoice: invoiceWithItems,
        template,
        business: business as Record<string, unknown>,
        party: (party as Record<string, unknown> | null) ?? undefined,
    });

    // Format amount
    const amount = new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
    }).format(invoice.grand_total);

    // Send email
    await emailService.sendInvoiceEmail({
        to: recipient_email,
        invoiceNumber: invoice.invoice_number,
        businessName: business.name,
        amount,
        pdfBuffer,
    });

    return sendSuccess(res, {
        message: "Invoice sent successfully via email",
        data: {
            invoice_id,
            invoice_number: invoice.invoice_number,
            recipient_email,
            sent_at: new Date().toISOString(),
        },
    });
}

export async function testEmailConfigHandler(req: Request, res: Response) {
    if (!emailService.isReady()) {
        throw new AppError(
            "Email service is not configured",
            503,
            ERROR_CODES.BAD_REQUEST
        );
    }

    const testEmail = req.body.test_email || process.env.EMAIL_USER;

    await emailService.sendEmail({
        to: testEmail,
        subject: "VyaparX Email Service Test",
        text: "This is a test email from VyaparX. If you received this, your email service is configured correctly!",
        html: `
            <div style="font-family: Arial, sans-serif; padding: 20px;">
                <h2 style="color: #4F46E5;">Email Service Test</h2>
                <p>This is a test email from VyaparX.</p>
                <p>If you received this, your email service is configured correctly! ✅</p>
                <hr style="border: 1px solid #e5e7eb; margin: 20px 0;">
                <p style="color: #6b7280; font-size: 0.9em;">
                    Sent at: ${new Date().toLocaleString()}
                </p>
            </div>
        `,
    });

    return sendSuccess(res, {
        message: "Test email sent successfully",
        data: {
            recipient: testEmail,
            sent_at: new Date().toISOString(),
        },
    });
}
