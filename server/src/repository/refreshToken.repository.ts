import pool from "../config/db";
import type { PoolClient } from "pg";
import type { CreateRefreshTokenInput, RefreshTokenRecord } from "../types/refreshToken";

const getDb = (client?: PoolClient) => client ?? pool;

export const refreshTokenRepository = {
    async create(input: CreateRefreshTokenInput): Promise<void> {
        const db = getDb(input.client);
        await db.query(
            `
            INSERT INTO refresh_tokens (token_id, user_id, business_id, expires_at)
            VALUES ($1, $2, $3, $4)
            `,
            [input.tokenId, input.userId, input.businessId ?? null, input.expiresAt]
        );
    },

    async findByTokenId(tokenId: string, client?: PoolClient): Promise<RefreshTokenRecord | null> {
        const db = getDb(client);
        const result = await db.query(
            `
            SELECT *
            FROM refresh_tokens
            WHERE token_id = $1
            `,
            [tokenId]
        );
        return (result.rows[0] as RefreshTokenRecord | undefined) ?? null;
    },

    async lockActiveTokenById(tokenId: string, client: PoolClient): Promise<RefreshTokenRecord | null> {
        const result = await client.query(
            `
            SELECT *
            FROM refresh_tokens
            WHERE token_id = $1
              AND revoked_at IS NULL
              AND expires_at > now()
            FOR UPDATE
            `,
            [tokenId]
        );
        return (result.rows[0] as RefreshTokenRecord | undefined) ?? null;
    },

    async revokeAndReplace(
        currentTokenId: string,
        replacementTokenId: string,
        client: PoolClient
    ): Promise<void> {
        await client.query(
            `
            UPDATE refresh_tokens
            SET revoked_at = now(),
                replaced_by_token_id = $2
            WHERE token_id = $1
            `,
            [currentTokenId, replacementTokenId]
        );
    },

    async revokeAllForUser(userId: string): Promise<void> {
        await pool.query(
            `
            UPDATE refresh_tokens
            SET revoked_at = now()
            WHERE user_id = $1
              AND revoked_at IS NULL
            `,
            [userId]
        );
    },
};

