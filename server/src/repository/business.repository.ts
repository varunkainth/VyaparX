import pool from "../config/db";
import type { PoolClient } from "pg";
import type {
    BusinessInviteCreateInput,
    BusinessInviteDetails,
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
                phone,email,website,logo_url,signature_url,invoice_prefix,purchase_prefix,reset_numbering,bank_name,bank_account_no,
                bank_ifsc,bank_branch,upi_id
            )
            VALUES (
                $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
                $11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23
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
                input.purchase_prefix ?? "PUR",
                input.reset_numbering ?? "never",
                input.bank_name ?? null,
                input.bank_account_no ?? null,
                input.bank_ifsc ?? null,
                input.bank_branch ?? null,
                input.upi_id ?? null,
            ]
        );
        const business = result.rows[0];

        await db.query(
            `
            INSERT INTO invoice_settings (business_id, invoice_prefix, purchase_prefix, reset_numbering)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (business_id)
            DO UPDATE SET
                invoice_prefix = EXCLUDED.invoice_prefix,
                purchase_prefix = EXCLUDED.purchase_prefix,
                reset_numbering = EXCLUDED.reset_numbering,
                updated_at = NOW()
            `,
            [
                business.id,
                business.invoice_prefix ?? input.invoice_prefix ?? "INV",
                business.purchase_prefix ?? input.purchase_prefix ?? "PUR",
                business.reset_numbering ?? input.reset_numbering ?? "never",
            ]
        );
        return business;
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

    async getBusinessById(businessId: string) {
        const result = await pool.query(
            `
            SELECT *
            FROM businesses
            WHERE id = $1
            `,
            [businessId]
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
        const business = result.rows[0] ?? null;

        if (!business) {
            return null;
        }

        if ("invoice_prefix" in patch || "purchase_prefix" in patch || "reset_numbering" in patch) {
            await pool.query(
                `
                INSERT INTO invoice_settings (business_id, invoice_prefix, purchase_prefix, reset_numbering)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (business_id)
                DO UPDATE SET
                    invoice_prefix = EXCLUDED.invoice_prefix,
                    purchase_prefix = EXCLUDED.purchase_prefix,
                    reset_numbering = EXCLUDED.reset_numbering,
                    updated_at = NOW()
                `,
                [
                    businessId,
                    business.invoice_prefix ?? "INV",
                    business.purchase_prefix ?? "PUR",
                    business.reset_numbering ?? "never",
                ]
            );
        }

        return business;
    },

    async inviteOrUpsertBusinessMember(args: BusinessMemberInviteInput, client?: PoolClient) {
        const db = getDb(client);
        const result = await db.query(
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

    async createBusinessInvite(args: BusinessInviteCreateInput, client?: PoolClient) {
        const db = getDb(client);
        await db.query(
            `
            UPDATE business_invites
            SET revoked_at = NOW(),
                updated_at = NOW()
            WHERE business_id = $1
              AND LOWER(email) = LOWER($2)
              AND accepted_at IS NULL
              AND revoked_at IS NULL
            `,
            [args.businessId, args.email]
        );

        const result = await db.query(
            `
            INSERT INTO business_invites (
                business_id, email, role, token, invited_by, expires_at
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
            `,
            [args.businessId, args.email, args.role, args.token, args.invitedBy, args.expiresAt]
        );
        return result.rows[0];
    },

    async getBusinessInviteByToken(token: string, client?: PoolClient): Promise<BusinessInviteDetails | null> {
        const db = getDb(client);
        const result = await db.query<BusinessInviteDetails>(
            `
            SELECT
                bi.*,
                b.name AS business_name,
                inviter.name AS inviter_name,
                inviter.email AS inviter_email,
                CASE
                    WHEN bi.revoked_at IS NOT NULL THEN 'revoked'
                    WHEN bi.accepted_at IS NOT NULL THEN 'accepted'
                    WHEN bi.expires_at <= NOW() THEN 'expired'
                    ELSE 'pending'
                END AS status
            FROM business_invites bi
            JOIN businesses b ON b.id = bi.business_id
            LEFT JOIN users inviter ON inviter.id = bi.invited_by
            WHERE bi.token = $1
            `,
            [token]
        );
        return result.rows[0] ?? null;
    },

    async listBusinessInvites(businessId: string, client?: PoolClient): Promise<BusinessInviteDetails[]> {
        const db = getDb(client);
        const result = await db.query<BusinessInviteDetails>(
            `
            SELECT
                bi.*,
                b.name AS business_name,
                inviter.name AS inviter_name,
                inviter.email AS inviter_email,
                CASE
                    WHEN bi.revoked_at IS NOT NULL THEN 'revoked'
                    WHEN bi.accepted_at IS NOT NULL THEN 'accepted'
                    WHEN bi.expires_at <= NOW() THEN 'expired'
                    ELSE 'pending'
                END AS status
            FROM business_invites bi
            JOIN businesses b ON b.id = bi.business_id
            LEFT JOIN users inviter ON inviter.id = bi.invited_by
            WHERE bi.business_id = $1
            ORDER BY bi.created_at DESC
            `,
            [businessId]
        );
        return result.rows;
    },

    async markBusinessInviteAccepted(token: string, acceptedByUserId: string, client?: PoolClient) {
        const db = getDb(client);
        const result = await db.query(
            `
            UPDATE business_invites
            SET accepted_at = NOW(),
                accepted_by_user_id = $2,
                updated_at = NOW()
            WHERE token = $1
            RETURNING *
            `,
            [token, acceptedByUserId]
        );
        return result.rows[0] ?? null;
    },

    async revokeBusinessInvite(businessId: string, inviteId: string, client?: PoolClient) {
        const db = getDb(client);
        const result = await db.query<BusinessInviteDetails>(
            `
            UPDATE business_invites bi
            SET revoked_at = NOW(),
                updated_at = NOW()
            FROM businesses b
            LEFT JOIN users inviter ON inviter.id = bi.invited_by
            WHERE bi.id = $1
              AND bi.business_id = $2
              AND bi.accepted_at IS NULL
              AND bi.revoked_at IS NULL
              AND b.id = bi.business_id
            RETURNING
                bi.*,
                b.name AS business_name,
                inviter.name AS inviter_name,
                inviter.email AS inviter_email,
                'revoked'::text AS status
            `,
            [inviteId, businessId]
        );
        return result.rows[0] ?? null;
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
