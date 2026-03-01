import pool from "../config/db";
import type { CreatePartyRecordInput } from "../types/party";

export const partyRepository = {
    async createParty(params: CreatePartyRecordInput) {
        const result = await pool.query(
            `
            INSERT INTO parties (
                business_id,name,party_type,gstin,pan,state_code,state,address,city,pincode,
                phone,email,opening_balance,opening_balance_type,current_balance,notes,is_active
            )
            VALUES (
                $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
                $11,$12,$13,$14,$15,$16,true
            )
            RETURNING *
            `,
            [
                params.business_id,
                params.name,
                params.party_type,
                params.gstin ?? null,
                params.pan ?? null,
                params.state_code ?? null,
                params.state ?? null,
                params.address ?? null,
                params.city ?? null,
                params.pincode ?? null,
                params.phone ?? null,
                params.email ?? null,
                params.opening_balance,
                params.opening_balance_type,
                params.current_balance,
                params.notes ?? null,
            ]
        );
        return result.rows[0];
    },

    async listParties(businessId: string, includeInactive: boolean) {
        const result = await pool.query(
            `
            SELECT *
            FROM parties
            WHERE business_id = $1
              AND ($2::boolean = true OR is_active = true)
            ORDER BY created_at DESC
            `,
            [businessId, includeInactive]
        );
        return result.rows;
    },

    async getPartyById(businessId: string, partyId: string) {
        const result = await pool.query(
            `
            SELECT *
            FROM parties
            WHERE business_id = $1
              AND id = $2
            `,
            [businessId, partyId]
        );
        return result.rows[0] ?? null;
    },

    async updateParty(businessId: string, partyId: string, patch: Record<string, unknown>) {
        const fields = Object.keys(patch);
        const setSql = fields.map((f, i) => `${f} = $${i + 1}`).concat("updated_at = now()").join(", ");
        const values = fields.map((f) => patch[f]);
        const result = await pool.query(
            `
            UPDATE parties
            SET ${setSql}
            WHERE business_id = $${fields.length + 1}
              AND id = $${fields.length + 2}
            RETURNING *
            `,
            [...values, businessId, partyId]
        );
        return result.rows[0] ?? null;
    },

    async deactivateParty(businessId: string, partyId: string) {
        const result = await pool.query(
            `
            UPDATE parties
            SET is_active = false, updated_at = now()
            WHERE business_id = $1
              AND id = $2
            RETURNING *
            `,
            [businessId, partyId]
        );
        return result.rows[0] ?? null;
    },
};
