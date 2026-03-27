import pool from "../config/db";
import type { InvoiceSettings, UpdateInvoiceSettingsInput } from "../types/invoice-settings";

export const invoiceSettingsRepository = {
    async getOrCreate(businessId: string): Promise<InvoiceSettings> {
        const client = await pool.connect();
        try {
            // Try to get existing settings
            let result = await client.query(
                "SELECT * FROM invoice_settings WHERE business_id = $1",
                [businessId]
            );

            if (result.rows.length === 0) {
                const businessResult = await client.query(
                    `
                    SELECT invoice_prefix, purchase_prefix, reset_numbering
                    FROM businesses
                    WHERE id = $1
                    `,
                    [businessId]
                );
                const business = businessResult.rows[0] ?? {};

                // Create default settings
                result = await client.query(
                    `INSERT INTO invoice_settings (business_id, invoice_prefix, purchase_prefix, reset_numbering) 
                     VALUES ($1, $2, $3, $4) 
                     RETURNING *`,
                    [
                        businessId,
                        business.invoice_prefix ?? "INV",
                        business.purchase_prefix ?? "PUR",
                        business.reset_numbering ?? "never",
                    ]
                );
            }

            return result.rows[0];
        } finally {
            client.release();
        }
    },

    async update(businessId: string, data: UpdateInvoiceSettingsInput): Promise<InvoiceSettings> {
        const fields: string[] = [];
        const values: any[] = [];
        let paramCount = 1;

        Object.entries(data).forEach(([key, value]) => {
            if (value !== undefined && key !== 'updated_at') { // Skip updated_at if it's in the data
                fields.push(`${key} = $${paramCount}`);
                values.push(value);
                paramCount++;
            }
        });

        if (fields.length === 0) {
            return this.getOrCreate(businessId);
        }

        // Always add updated_at at the end
        fields.push(`updated_at = NOW()`);
        values.push(businessId);

        const query = `
            UPDATE invoice_settings 
            SET ${fields.join(", ")}
            WHERE business_id = $${paramCount}
            RETURNING *
        `;

        const result = await pool.query(query, values);
        const settings = result.rows[0];

        if (settings && (data.invoice_prefix !== undefined || data.purchase_prefix !== undefined || data.reset_numbering !== undefined)) {
            await pool.query(
                `
                UPDATE businesses
                SET
                    invoice_prefix = $1,
                    purchase_prefix = $2,
                    reset_numbering = $3,
                    updated_at = NOW()
                WHERE id = $4
                `,
                [settings.invoice_prefix, settings.purchase_prefix, settings.reset_numbering, businessId]
            );
        }

        return settings;
    },

    async resetToDefaults(businessId: string): Promise<InvoiceSettings> {
        const result = await pool.query(
            `UPDATE invoice_settings 
             SET 
                invoice_prefix = 'INV',
                invoice_number_format = 'INV-{YYYY}-{####}',
                reset_numbering = 'never',
                purchase_prefix = 'PUR',
                purchase_number_format = 'PUR-{YYYY}-{####}',
                default_due_days = 30,
                default_template = 'default',
                default_currency = 'INR',
                enable_tax = true,
                tax_label = 'GST',
                show_tax_number = true,
                show_logo = true,
                show_signature = false,
                show_terms = false,
                default_terms = NULL,
                show_notes = false,
                default_notes = NULL,
                email_subject_template = 'Invoice {invoice_number} from {business_name}',
                email_body_template = 'Dear Customer,\n\nPlease find attached invoice {invoice_number} for {amount}.\n\nThank you for your business!',
                auto_send_email = false,
                enable_online_payment = false,
                payment_instructions = NULL,
                updated_at = NOW()
             WHERE business_id = $1
             RETURNING *`,
            [businessId]
        );

        const settings = result.rows[0];

        if (settings) {
            await pool.query(
                `
                UPDATE businesses
                SET
                    invoice_prefix = $1,
                    purchase_prefix = $2,
                    reset_numbering = $3,
                    updated_at = NOW()
                WHERE id = $4
                `,
                [settings.invoice_prefix, settings.purchase_prefix, settings.reset_numbering, businessId]
            );
        }

        return settings;
    },
};
