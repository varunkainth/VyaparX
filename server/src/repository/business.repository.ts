import pool from "../config/db";
import type { PoolClient } from "pg";
import type {
    BusinessMemberInviteInput,
    BusinessMemberMutationInput,
    BusinessMemberStatusInput,
    CreateBusinessInput,
} from "../types/business";

const getDb = (client?: PoolClient) => client ?? pool;

export const businessRepository = {
    async createBusiness(input: CreateBusinessInput, client?: PoolClient) {
        const db = getDb(client);
        const result = await db.query(
            `
            INSERT INTO businesses (
                owner_id,name,gstin,pan,state_code,address_line1,address_line2,city,state,pincode,
                phone,email,website,logo_url,signature_url,invoice_prefix,bank_name,bank_account_no,
                bank_ifsc,bank_branch,upi_id
            )
            VALUES (
                $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
                $11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21
            )
            RETURNING *
            `,
            [
                input.owner_id,
                input.name,
                input.gstin ?? null,
                input.pan ?? null,
                input.state_code,
                input.address_line1,
                input.address_line2 ?? null,
                input.city,
                input.state,
                input.pincode,
                input.phone,
                input.email,
                input.website ?? null,
                input.logo_url ?? null,
                input.signature_url ?? null,
                input.invoice_prefix ?? "INV",
                input.bank_name ?? null,
                input.bank_account_no ?? null,
                input.bank_ifsc ?? null,
                input.bank_branch ?? null,
                input.upi_id ?? null,
            ]
        );
        return result.rows[0];
    },

    async upsertOwnerMember(businessId: string, ownerId: string, client?: PoolClient) {
        const db = getDb(client);
        await db.query(
            `
            INSERT INTO business_members (business_id, user_id, role, invited_by, is_active)
            VALUES ($1, $2, 'owner', $2, true)
            ON CONFLICT (business_id, user_id)
            DO UPDATE SET role = 'owner', is_active = true
            `,
            [businessId, ownerId]
        );
    },

    async listUserBusinesses(userId: string) {
        const result = await pool.query(
            `
            SELECT
                b.*,
                CASE WHEN b.owner_id = $1 THEN 'owner' ELSE bm.role::text END AS user_role,
                u.name as owner_name,
                u.email as owner_email
            FROM businesses b
            LEFT JOIN business_members bm
                ON bm.business_id = b.id
               AND bm.user_id = $1
               AND bm.is_active = true
            LEFT JOIN users u
                ON u.id = b.owner_id
            WHERE b.owner_id = $1 OR bm.user_id = $1
            ORDER BY b.created_at DESC
            `,
            [userId]
        );
        return result.rows;
    },

    async getBusinessForUser(businessId: string, userId: string) {
        const result = await pool.query(
            `
            SELECT
                b.*,
                CASE WHEN b.owner_id = $2 THEN 'owner' ELSE bm.role::text END AS user_role,
                u.name as owner_name,
                u.email as owner_email
            FROM businesses b
            LEFT JOIN business_members bm
                ON bm.business_id = b.id
               AND bm.user_id = $2
               AND bm.is_active = true
            LEFT JOIN users u
                ON u.id = b.owner_id
            WHERE b.id = $1
              AND (b.owner_id = $2 OR bm.user_id = $2)
            `,
            [businessId, userId]
        );
        return result.rows[0] ?? null;
    },

    async updateBusiness(businessId: string, patch: Record<string, unknown>) {
        const fields = Object.keys(patch);
        const setSql = fields.map((f, i) => `${f} = $${i + 1}`).concat("updated_at = now()").join(", ");
        const values = fields.map((f) => patch[f]);
        const result = await pool.query(
            `
            UPDATE businesses
            SET ${setSql}
            WHERE id = $${fields.length + 1}
            RETURNING *
            `,
            [...values, businessId]
        );
        return result.rows[0] ?? null;
    },

    async inviteOrUpsertBusinessMember(args: BusinessMemberInviteInput) {
        const result = await pool.query(
            `
            INSERT INTO business_members (business_id, user_id, role, invited_by, is_active)
            VALUES ($1, $2, $3, $4, true)
            ON CONFLICT (business_id, user_id)
            DO UPDATE
               SET role = EXCLUDED.role,
                   invited_by = EXCLUDED.invited_by,
                   is_active = true
            RETURNING id, business_id, user_id, role, invited_by, joined_at, is_active
            `,
            [args.businessId, args.userId, args.role, args.invitedBy]
        );
        return result.rows[0];
    },

    async setBusinessMemberRole(args: BusinessMemberMutationInput) {
        const result = await pool.query(
            `
            UPDATE business_members
            SET role = $1
            WHERE business_id = $2
              AND user_id = $3
            RETURNING id, business_id, user_id, role, invited_by, joined_at, is_active
            `,
            [args.role, args.businessId, args.userId]
        );
        return result.rows[0] ?? null;
    },

    async setBusinessMemberStatus(args: BusinessMemberStatusInput) {
        const result = await pool.query(
            `
            UPDATE business_members
            SET is_active = $1
            WHERE business_id = $2
              AND user_id = $3
            RETURNING id, business_id, user_id, role, invited_by, joined_at, is_active
            `,
            [args.isActive, args.businessId, args.userId]
        );
        return result.rows[0] ?? null;
    },

    async getBusinessMembers(businessId: string) {
        const result = await pool.query(
            `
            SELECT 
                bm.user_id as id,
                bm.role,
                bm.is_active,
                bm.joined_at,
                u.name,
                u.email
            FROM business_members bm
            JOIN users u ON u.id = bm.user_id
            WHERE bm.business_id = $1
            ORDER BY 
                CASE bm.role 
                    WHEN 'owner' THEN 1 
                    WHEN 'admin' THEN 2 
                    WHEN 'staff' THEN 3 
                    WHEN 'accountant' THEN 4 
                    WHEN 'viewer' THEN 5 
                    ELSE 6 
                END,
                u.name ASC
            `,
            [businessId]
        );
        return result.rows;
    },
};
