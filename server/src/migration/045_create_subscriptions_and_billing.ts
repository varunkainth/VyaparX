import type { Pool, PoolClient } from "pg";
import pool from "../config/db";

type MigrationDb = Pick<PoolClient | Pool, "query">;

export async function up(db: MigrationDb = pool) {
  await db.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'plan_type') THEN
        CREATE TYPE plan_type AS ENUM ('free', 'pro');
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_status') THEN
        CREATE TYPE subscription_status AS ENUM ('trialing', 'active', 'past_due', 'cancelled', 'expired');
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'billing_cycle') THEN
        CREATE TYPE billing_cycle AS ENUM ('monthly', 'annual');
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_payment_status') THEN
        CREATE TYPE subscription_payment_status AS ENUM ('captured', 'failed', 'refunded');
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'coupon_discount_type') THEN
        CREATE TYPE coupon_discount_type AS ENUM ('percent', 'flat');
      END IF;
    END
    $$;

    CREATE TABLE IF NOT EXISTS coupons (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code TEXT NOT NULL,
      discount_type coupon_discount_type NOT NULL,
      discount_value INTEGER NOT NULL,
      applies_to_cycle billing_cycle,
      max_redemptions INTEGER,
      redemption_count INTEGER NOT NULL DEFAULT 0,
      valid_from TIMESTAMPTZ,
      valid_until TIMESTAMPTZ,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

      CONSTRAINT coupons_discount_value_positive CHECK (discount_value > 0),
      CONSTRAINT coupons_percent_max CHECK (
        discount_type <> 'percent' OR discount_value <= 100
      )
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_coupons_code_lower_uq ON coupons ((LOWER(code)));

    CREATE TABLE IF NOT EXISTS subscriptions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      plan plan_type NOT NULL DEFAULT 'free',
      status subscription_status NOT NULL DEFAULT 'trialing',
      billing_cycle billing_cycle,
      trial_ends_at TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '14 days',
      current_period_start TIMESTAMPTZ,
      current_period_end TIMESTAMPTZ,
      cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
      razorpay_subscription_id TEXT,
      razorpay_plan_id TEXT,
      coupon_id UUID REFERENCES coupons(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

      CONSTRAINT subscriptions_user_uq UNIQUE (user_id),
      CONSTRAINT subscriptions_razorpay_sub_uq UNIQUE (razorpay_subscription_id)
    );

    CREATE INDEX IF NOT EXISTS idx_subscriptions_plan ON subscriptions(plan);
    CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
    CREATE INDEX IF NOT EXISTS idx_subscriptions_trial ON subscriptions(trial_ends_at)
      WHERE status = 'trialing';
    CREATE INDEX IF NOT EXISTS idx_subscriptions_period ON subscriptions(current_period_end)
      WHERE status = 'active';

    CREATE TABLE IF NOT EXISTS subscription_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      razorpay_event_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      payload JSONB NOT NULL,
      processed_at TIMESTAMPTZ NOT NULL DEFAULT now(),

      CONSTRAINT subscription_events_razorpay_event_uq UNIQUE (razorpay_event_id)
    );

    CREATE INDEX IF NOT EXISTS idx_sub_events_user ON subscription_events(user_id);
    CREATE INDEX IF NOT EXISTS idx_sub_events_type ON subscription_events(event_type);

    CREATE TABLE IF NOT EXISTS subscription_payments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
      razorpay_payment_id TEXT NOT NULL,
      razorpay_invoice_id TEXT,
      amount_paise INTEGER NOT NULL,
      currency CHAR(3) NOT NULL DEFAULT 'INR',
      status subscription_payment_status NOT NULL,
      billing_period_start TIMESTAMPTZ,
      billing_period_end TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

      CONSTRAINT sub_payments_razorpay_pay_uq UNIQUE (razorpay_payment_id),
      CONSTRAINT sub_payments_amount_positive CHECK (amount_paise > 0)
    );

    CREATE INDEX IF NOT EXISTS idx_sub_payments_user ON subscription_payments(user_id);
    CREATE INDEX IF NOT EXISTS idx_sub_payments_status ON subscription_payments(status);

    CREATE OR REPLACE FUNCTION subscriptions_set_updated_at()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    AS $$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $$;

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'subscriptions_updated_at'
      ) THEN
        CREATE TRIGGER subscriptions_updated_at
          BEFORE UPDATE ON subscriptions
          FOR EACH ROW
          EXECUTE FUNCTION subscriptions_set_updated_at();
      END IF;
    END
    $$;

    CREATE OR REPLACE FUNCTION create_default_subscription()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    AS $$
    BEGIN
      INSERT INTO subscriptions (user_id)
      VALUES (NEW.id)
      ON CONFLICT (user_id) DO NOTHING;
      RETURN NEW;
    END;
    $$;

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'users_create_subscription'
      ) THEN
        CREATE TRIGGER users_create_subscription
          AFTER INSERT ON users
          FOR EACH ROW
          EXECUTE FUNCTION create_default_subscription();
      END IF;
    END
    $$;

    INSERT INTO subscriptions (user_id)
    SELECT u.id
    FROM users u
    LEFT JOIN subscriptions s ON s.user_id = u.id
    WHERE s.user_id IS NULL
    ON CONFLICT (user_id) DO NOTHING;
  `);

  console.log("Subscription model tables, enums, triggers, and backfill created");
}

if (import.meta.main) {
  up()
    .then(() => {
      console.log("Migration applied successfully");
    })
    .catch((error) => {
      console.error("Migration failed:", error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await pool.end();
    });
}