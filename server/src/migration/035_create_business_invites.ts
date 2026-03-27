import type { PoolClient } from "pg";

export async function up(client: PoolClient): Promise<void> {
    await client.query(`
        CREATE TABLE IF NOT EXISTS business_invites (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
            email VARCHAR(255) NOT NULL,
            role VARCHAR(32) NOT NULL CHECK (role IN ('admin', 'staff', 'accountant', 'viewer')),
            token VARCHAR(255) NOT NULL UNIQUE,
            invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
            accepted_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
            expires_at TIMESTAMPTZ NOT NULL,
            accepted_at TIMESTAMPTZ,
            revoked_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    `);

    await client.query(`
        CREATE INDEX IF NOT EXISTS idx_business_invites_business_id
        ON business_invites (business_id);
    `);

    await client.query(`
        CREATE INDEX IF NOT EXISTS idx_business_invites_email
        ON business_invites (LOWER(email));
    `);

    await client.query(`
        CREATE INDEX IF NOT EXISTS idx_business_invites_expires_at
        ON business_invites (expires_at);
    `);

    await client.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_business_invites_pending_unique
        ON business_invites (business_id, LOWER(email))
        WHERE accepted_at IS NULL AND revoked_at IS NULL;
    `);

    console.log("Business invites table created successfully");
}

export async function down(client: PoolClient): Promise<void> {
    await client.query(`DROP TABLE IF EXISTS business_invites;`);
}
