import pool from "../config/db";
import type { PoolClient } from "pg";
import { hashOpaqueToken } from "../utils/tokenHash";

const getDb = (client?: PoolClient) => client ?? pool;

export const emailVerificationRepository = {
    async createVerificationToken(userId: string, token: string, expiresAt: Date, client?: PoolClient) {
        const db = getDb(client);
        const tokenHash = hashOpaqueToken(token);
        const result = await db.query(
            `
            INSERT INTO email_verification_tokens (user_id, token, expires_at)
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
            SELECT evt.*, u.email, u.name, u.is_verified
            FROM email_verification_tokens evt
            JOIN users u ON u.id = evt.user_id
            WHERE evt.token = $1
              AND evt.expires_at > now()
              AND evt.verified_at IS NULL
            `,
            [tokenHash]
        );
        return result.rows[0] ?? null;
    },

    async markTokenAsVerified(token: string, client?: PoolClient) {
        const db = getDb(client);
        const tokenHash = hashOpaqueToken(token);
        await db.query(
            `
            UPDATE email_verification_tokens
            SET verified_at = now()
            WHERE token = $1
            `,
            [tokenHash]
        );
    },

    async deleteExpiredTokens(client?: PoolClient) {
        const db = getDb(client);
        await db.query(
            `
            DELETE FROM email_verification_tokens
            WHERE expires_at < now()
            `
        );
    },

    async deleteUserTokens(userId: string, client?: PoolClient) {
        const db = getDb(client);
        await db.query(
            `
            DELETE FROM email_verification_tokens
            WHERE user_id = $1
            `,
            [userId]
        );
    },

    async getLatestToken(userId: string, client?: PoolClient) {
        const db = getDb(client);
        const result = await db.query(
            `
            SELECT *
            FROM email_verification_tokens
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT 1
            `,
            [userId]
        );
        return result.rows[0] ?? null;
    },
};
