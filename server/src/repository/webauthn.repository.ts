import type { AuthenticatorTransportFuture, CredentialDeviceType } from "@simplewebauthn/server";
import type { PoolClient } from "pg";
import pool from "../config/db";
import type {
    WebAuthnChallengeRecord,
    WebAuthnChallengeType,
    WebAuthnCredentialRecord,
} from "../types/webauthn";

const getClient = (client?: PoolClient) => client ?? pool;

export const webauthnRepository = {
    async listCredentialsByUser(
        userId: string,
        client?: PoolClient
    ): Promise<WebAuthnCredentialRecord[]> {
        const db = getClient(client);
        const result = await db.query<WebAuthnCredentialRecord>(
            `SELECT
                id, user_id, credential_id, public_key, counter, transports,
                credential_device_type, credential_backed_up, label,
                last_used_at, created_at, updated_at
             FROM webauthn_credentials
             WHERE user_id = $1
             ORDER BY created_at DESC`,
            [userId]
        );

        return result.rows;
    },

    async findCredentialByCredentialId(
        credentialId: string,
        client?: PoolClient
    ): Promise<WebAuthnCredentialRecord | null> {
        const db = getClient(client);
        const result = await db.query<WebAuthnCredentialRecord>(
            `SELECT
                id, user_id, credential_id, public_key, counter, transports,
                credential_device_type, credential_backed_up, label,
                last_used_at, created_at, updated_at
             FROM webauthn_credentials
             WHERE credential_id = $1`,
            [credentialId]
        );

        return result.rows[0] ?? null;
    },

    async createCredential(
        data: {
            userId: string;
            credentialId: string;
            publicKey: string;
            counter: number;
            transports: AuthenticatorTransportFuture[];
            credentialDeviceType: CredentialDeviceType;
            credentialBackedUp: boolean;
            label: string;
        },
        client?: PoolClient
    ): Promise<WebAuthnCredentialRecord> {
        const db = getClient(client);
        const result = await db.query<WebAuthnCredentialRecord>(
            `INSERT INTO webauthn_credentials (
                user_id, credential_id, public_key, counter, transports,
                credential_device_type, credential_backed_up, label
             )
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING
                id, user_id, credential_id, public_key, counter, transports,
                credential_device_type, credential_backed_up, label,
                last_used_at, created_at, updated_at`,
            [
                data.userId,
                data.credentialId,
                data.publicKey,
                data.counter,
                data.transports,
                data.credentialDeviceType,
                data.credentialBackedUp,
                data.label,
            ]
        );

        const credential = result.rows[0];
        if (!credential) {
            throw new Error("Failed to create passkey credential");
        }

        return credential;
    },

    async updateCredentialUsage(
        credentialId: string,
        data: {
            counter: number;
            credentialDeviceType: CredentialDeviceType;
            credentialBackedUp: boolean;
        },
        client?: PoolClient
    ): Promise<void> {
        const db = getClient(client);
        await db.query(
            `UPDATE webauthn_credentials
             SET
                counter = $1,
                credential_device_type = $2,
                credential_backed_up = $3,
                last_used_at = now(),
                updated_at = now()
             WHERE credential_id = $4`,
            [
                data.counter,
                data.credentialDeviceType,
                data.credentialBackedUp,
                credentialId,
            ]
        );
    },

    async deleteCredentialByCredentialId(
        userId: string,
        credentialId: string,
        client?: PoolClient
    ): Promise<boolean> {
        const db = getClient(client);
        const result = await db.query(
            `DELETE FROM webauthn_credentials
             WHERE user_id = $1 AND credential_id = $2`,
            [userId, credentialId]
        );

        return result.rowCount === 1;
    },

    async deleteChallengesForUser(
        userId: string,
        challengeType: WebAuthnChallengeType,
        client?: PoolClient
    ): Promise<void> {
        const db = getClient(client);
        await db.query(
            `DELETE FROM webauthn_challenges
             WHERE user_id = $1 AND challenge_type = $2`,
            [userId, challengeType]
        );
    },

    async createChallenge(
        data: {
            userId: string;
            challenge: string;
            challengeType: WebAuthnChallengeType;
            expiresAt: Date;
        },
        client?: PoolClient
    ): Promise<WebAuthnChallengeRecord> {
        const db = getClient(client);
        const result = await db.query<WebAuthnChallengeRecord>(
            `INSERT INTO webauthn_challenges (user_id, challenge, challenge_type, expires_at)
             VALUES ($1, $2, $3, $4)
             RETURNING id, user_id, challenge, challenge_type, expires_at, created_at`,
            [data.userId, data.challenge, data.challengeType, data.expiresAt]
        );

        const challenge = result.rows[0];
        if (!challenge) {
            throw new Error("Failed to create WebAuthn challenge");
        }

        return challenge;
    },

    async findActiveChallengeForUser(
        userId: string,
        challengeType: WebAuthnChallengeType,
        client?: PoolClient
    ): Promise<WebAuthnChallengeRecord | null> {
        const db = getClient(client);
        const result = await db.query<WebAuthnChallengeRecord>(
            `SELECT id, user_id, challenge, challenge_type, expires_at, created_at
             FROM webauthn_challenges
             WHERE user_id = $1
               AND challenge_type = $2
               AND expires_at > now()
             ORDER BY created_at DESC
             LIMIT 1`,
            [userId, challengeType]
        );

        return result.rows[0] ?? null;
    },
};
