import pool from "../config/db";
import type { PoolClient } from "pg";
import { hashOpaqueToken } from "../utils/tokenHash";

const getDb = (client?: PoolClient) => client ?? pool;

export const passwordResetRepository = {
    async createResetToken(userId: string, token: string, expiresAt: Date, client?: PoolClient) {
        const db = getDb(client);
        const tokenHash = hashOpaqueToken(token);
        const result = await db.query(
            `
            INSERT INTO password_reset_tokens (user_id, token, expires_at)
            VALUES ($1, $2, $3)
            RETURNING *
            `,
            [userId, tokenHash, expiresAt]
        );
        return result.rows[0];
    },

    async findValidToken(token: string, client?: PoolClient) {
        const db = getDb(client);
        const tokenHash = hashOpaqueToken(token);
        const result = await db.query(
            `
            SELECT prt.*, u.email, u.name
            FROM password_reset_tokens prt
            JOIN users u ON u.id = prt.user_id
            WHERE prt.token = $1
              AND prt.expires_at > now()
              AND prt.used_at IS NULL
            `,
            [tokenHash]
        );
        return result.rows[0] ?? null;
    },

    async markTokenAsUsed(token: string, client?: PoolClient) {
        const db = getDb(client);
        const tokenHash = hashOpaqueToken(token);
        await db.query(
            `
            UPDATE password_reset_tokens
            SET used_at = now()
            WHERE token = $1
            `,
            [tokenHash]
        );
    },

    async deleteExpiredTokens(client?: PoolClient) {
        const db = getDb(client);
        await db.query(
            `
            DELETE FROM password_reset_tokens
            WHERE expires_at < now()
            `
        );
    },

    async deleteUserTokens(userId: string, client?: PoolClient) {
        const db = getDb(client);
        await db.query(
            `
            DELETE FROM password_reset_tokens
            WHERE user_id = $1
            `,
            [userId]
        );
    },
};
