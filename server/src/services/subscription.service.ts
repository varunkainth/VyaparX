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