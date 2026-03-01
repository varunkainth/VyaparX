import pool from "../config/db";
import type { PaginationOptions } from "../types/common";
import type {
    BusinessMember,
    CreateUserInput,
    DatabaseUser,
    PublicUser,
    UpdateUserInput,
    UserRole,
} from "../types/user";
import type { PoolClient } from "pg";

const PUBLIC_FIELDS = `
    id, name, email, phone,
    is_verified, token_version,
    is_active, created_at, updated_at
`;

function getClient(client?: PoolClient) {
    return client ?? pool;
}

export const userRepository = {
    async findByEmail(email: string, client?: PoolClient): Promise<DatabaseUser | null> {
        const db = getClient(client);

        const result = await db.query<DatabaseUser>(
            `SELECT
                id, name, email, phone, password_hash,
                is_verified, token_version, is_active,
                created_at, updated_at
             FROM users
             WHERE email = $1 AND is_active = true`,
            [email]
        );

        return result.rows[0] ?? null;
    },

    async findByPhone(phone: string, client?: PoolClient): Promise<DatabaseUser | null> {
        const db = getClient(client);

        const result = await db.query<DatabaseUser>(
            `SELECT
                id, name, email, phone, password_hash,
                is_verified, token_version, is_active,
                created_at, updated_at
             FROM users
             WHERE phone = $1 AND is_active = true`,
            [phone]
        );

        return result.rows[0] ?? null;
    },

    async findById(id: string, client?: PoolClient): Promise<PublicUser | null> {
        const db = getClient(client);

        const result = await db.query<PublicUser>(
            `SELECT ${PUBLIC_FIELDS}
             FROM users
             WHERE id = $1 AND is_active = true`,
            [id]
        );

        return result.rows[0] ?? null;
    },

    async findAuthById(id: string, client?: PoolClient): Promise<DatabaseUser | null> {
        const db = getClient(client);

        const result = await db.query<DatabaseUser>(
            `SELECT
                id, name, email, phone, password_hash,
                is_verified, token_version, is_active,
                created_at, updated_at
             FROM users
             WHERE id = $1 AND is_active = true`,
            [id]
        );

        return result.rows[0] ?? null;
    },

    async createUser(data: CreateUserInput, client?: PoolClient): Promise<PublicUser> {
        const db = getClient(client);

        const result = await db.query<PublicUser>(
            `INSERT INTO users (name, email, password_hash, phone)
             VALUES ($1, $2, $3, $4)
             RETURNING ${PUBLIC_FIELDS}`,
            [data.name, data.email, data.password_hash, data.phone]
        );

        const user = result.rows[0];
        if (!user) {
            throw new Error("User creation failed - no data returned");
        }

        return user;
    },

    async updateUser(
        id: string,
        data: UpdateUserInput,
        client?: PoolClient
    ): Promise<PublicUser | null> {
        const db = getClient(client);

        const fields = Object.keys(data) as (keyof UpdateUserInput)[];
        if (fields.length === 0) return null;

        const setClause = fields
            .map((key, index) => `${key} = $${index + 1}`)
            .join(", ");

        const values = fields.map((key) => data[key]);

        const result = await db.query<PublicUser>(
            `UPDATE users
             SET ${setClause}, updated_at = now()
             WHERE id = $${fields.length + 1}
               AND is_active = true
             RETURNING ${PUBLIC_FIELDS}`,
            [...values, id]
        );

        return result.rows[0] ?? null;
    },

    async updatePassword(id: string, newPasswordHash: string, client?: PoolClient): Promise<void> {
        const db = getClient(client);

        const result = await db.query(
            `UPDATE users
             SET password_hash = $1,
                 updated_at = now(),
                 token_version = token_version + 1
             WHERE id = $2 AND is_active = true`,
            [newPasswordHash, id]
        );

        if (result.rowCount !== 1) {
            throw new Error("Password update failed");
        }
    },

    async markVerified(id: string, client?: PoolClient): Promise<void> {
        const db = getClient(client);

        await db.query(
            `UPDATE users
             SET is_verified = true,
                 updated_at = now()
             WHERE id = $1 AND is_active = true`,
            [id]
        );
    },

    async incrementTokenVersion(id: string, client?: PoolClient): Promise<void> {
        const db = getClient(client);

        await db.query(
            `UPDATE users
             SET token_version = token_version + 1
             WHERE id = $1 AND is_active = true`,
            [id]
        );
    },

    async getAllUsers(options: PaginationOptions = {}, client?: PoolClient): Promise<PublicUser[]> {
        const db = getClient(client);

        const limit = Math.min(options.limit ?? 50, 100);
        const offset = options.offset ?? 0;

        const result = await db.query<PublicUser>(
            `SELECT ${PUBLIC_FIELDS}
             FROM users
             WHERE is_active = true
             ORDER BY created_at DESC
             LIMIT $1 OFFSET $2`,
            [limit, offset]
        );

        return result.rows;
    },

    async countUsers(client?: PoolClient): Promise<number> {
        const db = getClient(client);

        const result = await db.query<{ count: string }>(
            `SELECT COUNT(*) as count
             FROM users
             WHERE is_active = true`
        );

        return Number(result.rows[0]?.count ?? 0);
    },

    async softDeleteUser(id: string, client?: PoolClient): Promise<void> {
        const db = getClient(client);

        const result = await db.query(
            `UPDATE users
             SET is_active = false,
                 deleted_at = now(),
                 updated_at = now(),
                 token_version = token_version + 1
             WHERE id = $1`,
            [id]
        );

        if (result.rowCount !== 1) {
            throw new Error("User deletion failed");
        }
    },

    async getBusinessMemberRole(
        businessId: string,
        userId: string,
        client?: PoolClient
    ): Promise<UserRole | null> {
        const db = getClient(client);

        const result = await db.query<{ role: UserRole }>(
            `SELECT role
             FROM business_members
             WHERE business_id = $1
               AND user_id = $2
               AND is_active = true`,
            [businessId, userId]
        );

        return result.rows[0]?.role ?? null;
    },

    async setBusinessMemberRole(
        businessId: string,
        userId: string,
        role: UserRole,
        client?: PoolClient
    ): Promise<void> {
        const db = getClient(client);

        const result = await db.query(
            `UPDATE business_members
             SET role = $1
             WHERE business_id = $2
               AND user_id = $3
               AND is_active = true`,
            [role, businessId, userId]
        );

        if (result.rowCount !== 1) {
            throw new Error("Business member role update failed");
        }
    },

    async findBusinessMember(
        businessId: string,
        userId: string,
        client?: PoolClient
    ): Promise<BusinessMember | null> {
        const db = getClient(client);

        const result = await db.query<BusinessMember>(
            `SELECT id, business_id, user_id, role, invited_by, joined_at, is_active
             FROM business_members
             WHERE business_id = $1
               AND user_id = $2`,
            [businessId, userId]
        );

        return result.rows[0] ?? null;
    },
};
