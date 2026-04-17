import pool from "../config/db"

export interface SubscriptionRow {
  plan: 'free' | 'pro'
  status: 'trialing' | 'active' | 'past_due' | 'cancelled' | 'expired'
  trial_ends_at: Date
  current_period_end: Date | null
  cancel_at_period_end: boolean
}

export async function getSubscriptionByUserId(
  userId: string
): Promise<SubscriptionRow | null> {
  const { rows } = await pool.query<SubscriptionRow>(
    `SELECT plan, status, trial_ends_at, current_period_end, cancel_at_period_end
     FROM subscriptions
     WHERE user_id = $1`,
    [userId]
  )
  return rows[0] ?? null
}

export async function getInvoiceCountThisMonth(
  businessId: string
): Promise<number> {
  const { rows } = await pool.query<{ count: string }>(
    `SELECT COUNT(*) as count
     FROM invoices
     WHERE business_id = $1
       AND deleted_at IS NULL
       AND created_at >= date_trunc('month', now())`,
    [businessId]
  );
  if (rows.length === 0) {
    return 0;
  }
  return parseInt(rows[0]?.count ?? '0', 10)
}

export async function getPartyCount(businessId: string): Promise<number> {
  const { rows } = await pool.query<{ count: string }>(
    `SELECT COUNT(*) as count
     FROM parties
     WHERE business_id = $1
       AND deleted_at IS NULL`,
    [businessId]
  )
  if (rows.length === 0) {
    return 0;
  }
  return parseInt(rows[0]?.count ?? '0', 10)
}

export async function getBusinessCount(userId: string): Promise<number> {
  const { rows } = await pool.query<{ count: string }>(
    `SELECT COUNT(*) as count
     FROM business_members
     WHERE user_id = $1
       AND role = 'owner'`,
    [userId]
  )
  if (rows.length === 0) {
    return 0;
  }
  return parseInt(rows[0]?.count ?? '0', 10)
}

export async function getMemberCount(businessId: string): Promise<number> {
  const { rows } = await pool.query<{ count: string }>(
    `SELECT COUNT(*) as count
     FROM business_members
     WHERE business_id = $1`,
    [businessId]
  )
  if (rows.length === 0) {
    return 0;
  }
  return parseInt(rows[0]?.count ?? '0', 10)
}