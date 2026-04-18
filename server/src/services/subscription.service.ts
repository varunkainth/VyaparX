import crypto from 'crypto'
import { razorpay, RAZORPAY_PLANS, validateRazorpayConfig } from '../config/razorpay'
import { bustPlanCache } from '../utils/getPlan'
import pool  from '../config/db'
import { AppError } from '../utils/appError'
import { ERROR_CODES } from '../constants/errorCodes'
import { logger } from '../utils/logger'

type RazorpayErrorLike = {
  statusCode?: number
  error?: {
    code?: string
    description?: string
    source?: string
    step?: string
    reason?: string
    metadata?: unknown
  }
  message?: string
}


// Razorpay API types (partial, extend as needed)
type RazorpaySubscriptionLike = {
  id: string
  status?: string
  current_start?: number
  current_end?: number
  plan_amount?: number
  currency?: string
}

type RazorpayPaymentLike = {
  id: string
  invoice_id?: string
  amount?: number
  currency?: string
  status?: string
}

function mapRazorpayCreateError(error: RazorpayErrorLike): AppError {
  const description = error.error?.description || error.message || 'Subscription provider request failed'
  const code = error.error?.code || 'UNKNOWN_RAZORPAY_ERROR'

  // Razorpay returns this when credentials or API capability mismatch makes endpoint unreachable.
  if (description.toLowerCase().includes('requested url was not found on the server')) {
    return new AppError(
      'Unable to create subscription with Razorpay. Check test/live key pair, subscription capability, and plan IDs.',
      502,
      ERROR_CODES.SERVICE_UNAVAILABLE,
      { provider: 'razorpay', code, description }
    )
  }

  return new AppError(
    description,
    400,
    ERROR_CODES.BAD_REQUEST,
    { provider: 'razorpay', code, description }
  )
}

// ─── Create checkout session ──────────────────────────────────────────────────
export async function createSubscriptionSession(
  userId: string,
  userEmail: string,
  billingCycle: 'monthly' | 'annual',
  couponCode?: string
) {
  validateRazorpayConfig()

  const planId = RAZORPAY_PLANS[billingCycle]
  if (!planId || !planId.startsWith('plan_')) {
    throw new AppError(
      `Missing or invalid Razorpay plan id for ${billingCycle} billing cycle`,
      500,
      ERROR_CODES.INTERNAL_ERROR
    )
  }

  // Validate coupon if provided
  let couponId: string | null = null
  if (couponCode) {
    const { rows } = await pool.query(
      `SELECT id FROM coupons
       WHERE LOWER(code) = LOWER($1)
         AND is_active = true
         AND (valid_from IS NULL OR valid_from <= now())
         AND (valid_until IS NULL OR valid_until > now())
         AND (max_redemptions IS NULL OR redemption_count < max_redemptions)
         AND (applies_to_cycle IS NULL OR applies_to_cycle = $2)`,
      [couponCode, billingCycle]
    )
    if (!rows[0]) {
      throw new AppError('Invalid or expired coupon code.', 400, ERROR_CODES.BAD_REQUEST)
    }
    couponId = rows[0].id
  }

  let rzSub: { id: string }
  try {
    // Create Razorpay subscription.
    rzSub = await razorpay.subscriptions.create({
      plan_id: planId,
      total_count: billingCycle === 'annual' ? 12 : 120,
      quantity: 1,
      customer_notify: 1,
      notes: {
        user_id: userId,
        billing_cycle: billingCycle,
      },
    })
  } catch (error) {
    logger.error(
      {
        err: error,
        userId,
        billingCycle,
        planId,
      },
      'Failed to create Razorpay subscription'
    )
    throw mapRazorpayCreateError(error as RazorpayErrorLike)
  }

  // Save subscription_id + coupon to DB (status stays trialing until webhook)
  await pool.query(
    `UPDATE subscriptions
     SET razorpay_subscription_id = $1,
         razorpay_plan_id         = $2,
         billing_cycle            = $3,
         coupon_id                = $4,
         updated_at               = now()
     WHERE user_id = $5`,
    [rzSub.id, planId, billingCycle, couponId, userId]
  )

  // Increment coupon redemption count
  if (couponId) {
    await pool.query(
      `UPDATE coupons SET redemption_count = redemption_count + 1 WHERE id = $1`,
      [couponId]
    )
  }

  return {
    subscription_id: rzSub.id,
    razorpay_key:    process.env.RAZORPAY_KEY_ID,
  }
}

// ─── Get subscription status ──────────────────────────────────────────────────
export async function getSubscriptionStatus(userId: string) {
  const { rows } = await pool.query(
    `SELECT s.plan, s.status, s.billing_cycle,
            s.trial_ends_at, s.current_period_end,
            s.cancel_at_period_end,
            c.code as coupon_code, c.discount_type, c.discount_value
     FROM subscriptions s
     LEFT JOIN coupons c ON c.id = s.coupon_id
     WHERE s.user_id = $1`,
    [userId]
  )
  return rows[0] ?? null
}

type SyncedState = {
  status: 'active' | 'past_due' | 'cancelled' | 'expired'
  plan: 'free' | 'pro'
}

function resolveSyncedState(rzStatus: string, currentEndUnix?: number): SyncedState {
  const normalized = rzStatus.toLowerCase()

  if (normalized === 'active' || normalized === 'authenticated') {
    return { status: 'active', plan: 'pro' }
  }

  if (normalized === 'pending' || normalized === 'halted' || normalized === 'paused') {
    return { status: 'past_due', plan: 'pro' }
  }

  if (normalized === 'cancelled') {
    const stillInPaidPeriod =
      typeof currentEndUnix === 'number' &&
      Number.isFinite(currentEndUnix) &&
      currentEndUnix * 1000 > Date.now()

    return { status: 'cancelled', plan: stillInPaidPeriod ? 'pro' : 'free' }
  }

  return { status: 'expired', plan: 'free' }
}

export async function syncSubscriptionStatus(userId: string) {
  logger.info({ userId }, 'syncSubscriptionStatus called')
  const { rows } = await pool.query<{ razorpay_subscription_id: string | null }>(
    `SELECT razorpay_subscription_id FROM subscriptions WHERE user_id = $1`,
    [userId]
  )

  const razorpaySubscriptionId = rows[0]?.razorpay_subscription_id
  logger.info({ razorpaySubscriptionId }, 'Fetched razorpaySubscriptionId')
  if (!razorpaySubscriptionId) {
    throw new AppError('No Razorpay subscription found to sync.', 404, ERROR_CODES.NOT_FOUND)
  }

  let razorpaySubscription: RazorpaySubscriptionLike
  try {
    razorpaySubscription = await razorpay.subscriptions.fetch(razorpaySubscriptionId) as RazorpaySubscriptionLike
    logger.info({ razorpaySubscription }, 'Fetched razorpaySubscription')
  } catch (error) {
    logger.error({ err: error, userId, razorpaySubscriptionId }, 'Failed to sync subscription from Razorpay')
    throw mapRazorpayCreateError(error as RazorpayErrorLike)
  }

  const currentStartUnix =
    typeof razorpaySubscription.current_start === 'number' && Number.isFinite(razorpaySubscription.current_start)
      ? razorpaySubscription.current_start
      : null
  const currentEndUnix =
    typeof razorpaySubscription.current_end === 'number' && Number.isFinite(razorpaySubscription.current_end)
      ? razorpaySubscription.current_end
      : null

  const nextState = resolveSyncedState(razorpaySubscription.status ?? 'expired', currentEndUnix ?? undefined)
  logger.info({ currentStartUnix, currentEndUnix, nextState }, 'Parsed subscription period and state')

  await pool.query(
    `UPDATE subscriptions
     SET status               = $1,
         plan                 = $2,
         current_period_start = COALESCE(to_timestamp($3), current_period_start),
         current_period_end   = COALESCE(to_timestamp($4), current_period_end),
         updated_at           = now()
     WHERE user_id = $5`,
    [nextState.status, nextState.plan, currentStartUnix, currentEndUnix, userId]
  )

  // Insert payment record if active and not already present
  if (nextState.status === 'active' && currentStartUnix && currentEndUnix) {
    const { rows: subRows } = await pool.query<{ id: string }>(
      `SELECT id FROM subscriptions WHERE user_id = $1`,
      [userId]
    )
    const subscriptionId = subRows[0]?.id
    if (subscriptionId) {
      // Check if a payment exists for this period (by period or by payment id)
      logger.info({ userId, currentStartUnix, currentEndUnix }, 'Checking for existing payment record')
      const { rows: paymentRows } = await pool.query<{ id: string }>(
        `SELECT id FROM subscription_payments WHERE user_id = $1 AND billing_period_start = to_timestamp($2) AND billing_period_end = to_timestamp($3)`,
        [userId, currentStartUnix, currentEndUnix]
      )
      if (paymentRows.length === 0) {
        // Try to fetch latest payment for this subscription period
        let amount = razorpaySubscription.plan_amount ?? 0
        let currency = String(razorpaySubscription.currency ?? 'INR').toUpperCase()
        // Defensive: fallback if missing
        if (!amount || amount <= 0) amount = 1
        if (!currency) currency = 'INR'
        logger.info({ userId, subscriptionId, amount, currency, currentStartUnix, currentEndUnix }, 'Inserting new subscription_payments record')
        await pool.query(
          `INSERT INTO subscription_payments
             (user_id, subscription_id, amount_paise, currency, status, billing_period_start, billing_period_end)
           VALUES ($1, $2, $3, $4, 'captured', to_timestamp($5), to_timestamp($6))`,
          [userId, subscriptionId, amount, currency, currentStartUnix, currentEndUnix]
        )
      } else {
        logger.info({ userId, subscriptionId, currentStartUnix, currentEndUnix }, 'Payment record already exists for this period')
      }
    }
  }

  await bustPlanCache(userId)
  return getSubscriptionStatus(userId)
}


type SubscriptionPaymentHistoryRow = {
  id: string
  razorpay_payment_id: string | null
  razorpay_invoice_id: string | null
  amount_paise: number
  currency: string
  status: 'captured' | 'failed'
  billing_period_start: Date | null
  billing_period_end: Date | null
  created_at: Date
}

export async function listSubscriptionPayments(userId: string) {
  const { rows } = await pool.query<SubscriptionPaymentHistoryRow>(
    `SELECT id,
            razorpay_payment_id,
            razorpay_invoice_id,
            amount_paise,
            currency,
            status,
            billing_period_start,
            billing_period_end,
            created_at
     FROM subscription_payments
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT 50`,
    [userId]
  )

  return rows
}

// ─── Cancel subscription ──────────────────────────────────────────────────────
export async function cancelSubscription(userId: string) {
  const { rows } = await pool.query(
    `SELECT razorpay_subscription_id FROM subscriptions WHERE user_id = $1`,
    [userId]
  )
  const sub = rows[0]
  if (!sub?.razorpay_subscription_id) {
    throw new AppError('No active subscription found.', 404, ERROR_CODES.NOT_FOUND)
  }

  // Cancel at period end via Razorpay
  await razorpay.subscriptions.cancel(sub.razorpay_subscription_id, true)

  // Mark in DB
  await pool.query(
    `UPDATE subscriptions
     SET cancel_at_period_end = true, updated_at = now()
     WHERE user_id = $1`,
    [userId]
  )

  await bustPlanCache(userId)
}

// ─── Verify Razorpay webhook signature ───────────────────────────────────────
export function verifyWebhookSignature(
  rawBody: Buffer,
  signature: string,
  secret: string
): boolean {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex')
  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(signature)
  )
}