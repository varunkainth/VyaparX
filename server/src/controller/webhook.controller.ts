import type { Request, Response } from 'express'
import pool from '../config/db'
import { RAZORPAY_WEBHOOK_SECRET } from '../config/razorpay'
import { verifyWebhookSignature } from '../services/subscription.service'
import { bustPlanCache } from '../utils/getPlan'
import { logger } from '../utils/logger'

const SUPPORTED_EVENTS = new Set([
  'subscription.activated',
  'subscription.charged',
  'subscription.pending',
  'subscription.halted',
  'subscription.cancelled',
  'subscription.completed',
  'payment.failed',
])

const unknownEventCounts = new Map<string, number>()

export async function handleRazorpayWebhook(
  req: Request,
  res: Response
): Promise<void> {
  const startedAt = Date.now()
  const requestId = req.id ?? null
  const rawBody = req.body as Buffer
  const signature = req.headers['x-razorpay-signature'] as string | undefined

  if (!signature || !RAZORPAY_WEBHOOK_SECRET) {
    logger.warn(
      {
        requestId,
        hasSignature: Boolean(signature),
        hasWebhookSecret: Boolean(RAZORPAY_WEBHOOK_SECRET),
      },
      'Razorpay webhook rejected: missing signature or secret'
    )
    res.status(400).json({ error: 'Invalid webhook request' })
    return
  }

  if (!verifyWebhookSignature(rawBody, signature, RAZORPAY_WEBHOOK_SECRET)) {
    logger.warn(
      { requestId, signaturePrefix: signature.slice(0, 8) },
      'Razorpay webhook rejected: signature verification failed'
    )
    res.status(400).json({ error: 'Invalid signature' })
    return
  }

  let event: any
  try {
    event = JSON.parse(rawBody.toString())
  } catch (error) {
    logger.warn({ requestId, error }, 'Razorpay webhook rejected: invalid JSON payload')
    res.status(400).json({ error: 'Invalid payload' })
    return
  }

  const eventId = event.id as string
  const eventType = event.event as string

  if (!eventId || !eventType) {
    logger.warn(
      { requestId, hasEventId: Boolean(eventId), hasEventType: Boolean(eventType) },
      'Razorpay webhook rejected: missing event metadata'
    )
    res.status(400).json({ error: 'Invalid payload' })
    return
  }

  try {
    await pool.query(
      `INSERT INTO subscription_events
         (razorpay_event_id, event_type, payload)
       VALUES ($1, $2, $3)`,
      [eventId, eventType, event]
    )
  } catch (err: any) {
    if (err?.code === '23505') {
      logger.info(
        {
          requestId,
          eventId,
          eventType,
          durationMs: Date.now() - startedAt,
        },
        'Razorpay webhook replay ignored (already processed)'
      )
      res.status(200).json({ status: 'already_processed' })
      return
    }
    throw err
  }

  const rzSub = event.payload?.subscription?.entity
  const rzPay = event.payload?.payment?.entity

  let userId: string | null = null
  if (rzSub?.id) {
    const { rows } = await pool.query<{ user_id: string }>(
      `SELECT user_id FROM subscriptions WHERE razorpay_subscription_id = $1`,
      [rzSub.id]
    )
    userId = rows[0]?.user_id ?? null
  }

  if (userId) {
    await pool.query(
      `UPDATE subscription_events SET user_id = $1 WHERE razorpay_event_id = $2`,
      [userId, eventId]
    )
  }

  if (!SUPPORTED_EVENTS.has(eventType)) {
    const currentCount = unknownEventCounts.get(eventType) ?? 0
    const nextCount = currentCount + 1
    unknownEventCounts.set(eventType, nextCount)

    logger.warn(
      {
        requestId,
        eventId,
        eventType,
        unknownEventCount: nextCount,
        durationMs: Date.now() - startedAt,
      },
      'Razorpay webhook received unsupported event type'
    )

    res.status(200).json({ status: 'ignored_unknown_event' })
    return
  }

  try {
    switch (eventType) {
      case 'subscription.activated':
        if (userId) await handleActivated(userId, rzSub)
        break
      case 'subscription.charged':
        if (userId) await handleCharged(userId, rzSub, rzPay)
        break
      case 'subscription.pending':
      case 'subscription.halted':
        if (userId) await handlePastDue(userId)
        break
      case 'subscription.cancelled':
      case 'subscription.completed':
        if (userId) await handleCancelledOrCompleted(userId, rzSub, eventType)
        break
      case 'payment.failed':
        await handlePaymentFailed(userId, rzPay)
        break
      default:
        break
    }

    if (userId) {
      await bustPlanCache(userId)
    }

    logger.info(
      {
        requestId,
        eventId,
        eventType,
        userId,
        durationMs: Date.now() - startedAt,
      },
      'Razorpay webhook processed'
    )
  } catch (err) {
    logger.error(
      {
        requestId,
        eventId,
        eventType,
        userId,
        durationMs: Date.now() - startedAt,
        err,
      },
      'Razorpay webhook handler error'
    )
  }

  res.status(200).json({ status: 'ok' })
}

async function handleActivated(userId: string, rzSub: any) {
  await pool.query(
    `UPDATE subscriptions
     SET status                = 'active',
         plan                  = 'pro',
         current_period_start  = to_timestamp($1),
         current_period_end    = to_timestamp($2),
         updated_at            = now()
     WHERE user_id = $3`,
    [rzSub.current_start, rzSub.current_end, userId]
  )
}

async function handleCharged(userId: string, rzSub: any, rzPay: any) {
  await pool.query(
    `UPDATE subscriptions
     SET status               = 'active',
         plan                 = 'pro',
         current_period_start = to_timestamp($1),
         current_period_end   = to_timestamp($2),
         updated_at           = now()
     WHERE user_id = $3`,
    [rzSub.current_start, rzSub.current_end, userId]
  )

  if (!rzPay) return

  const { rows } = await pool.query<{ id: string }>(
    `SELECT id FROM subscriptions WHERE user_id = $1`,
    [userId]
  )

  const subscriptionId = rows[0]?.id
  if (!subscriptionId) return

  await pool.query(
    `INSERT INTO subscription_payments
       (user_id, subscription_id, razorpay_payment_id, razorpay_invoice_id,
        amount_paise, currency, status,
        billing_period_start, billing_period_end)
     VALUES ($1,$2,$3,$4,$5,$6,'captured',to_timestamp($7),to_timestamp($8))
     ON CONFLICT (razorpay_payment_id) DO NOTHING`,
    [
      userId,
      subscriptionId,
      rzPay.id,
      rzPay.invoice_id ?? null,
      rzPay.amount,
      String(rzPay.currency ?? 'INR').toUpperCase(),
      rzSub.current_start,
      rzSub.current_end,
    ]
  )
}

async function handlePastDue(userId: string) {
  await pool.query(
    `UPDATE subscriptions
     SET status = 'past_due', updated_at = now()
     WHERE user_id = $1`,
    [userId]
  )
}

async function handleCancelledOrCompleted(
  userId: string,
  rzSub: any,
  eventType: string
) {
  const status = eventType === 'subscription.completed' ? 'expired' : 'cancelled'
  await pool.query(
    `UPDATE subscriptions
     SET status               = $1,
         plan                 = CASE WHEN $2::timestamptz > now() THEN 'pro' ELSE 'free' END,
         cancel_at_period_end = false,
         current_period_end   = to_timestamp($3),
         updated_at           = now()
     WHERE user_id = $4`,
    [status, new Date(rzSub.current_end * 1000).toISOString(), rzSub.current_end, userId]
  )
}

async function handlePaymentFailed(userId: string | null, rzPay: any) {
  if (!userId || !rzPay) return

  const { rows } = await pool.query<{ id: string }>(
    `SELECT id FROM subscriptions WHERE user_id = $1`,
    [userId]
  )

  const subscriptionId = rows[0]?.id
  if (!subscriptionId) return

  await pool.query(
    `INSERT INTO subscription_payments
       (user_id, subscription_id, razorpay_payment_id,
        amount_paise, currency, status)
     VALUES ($1,$2,$3,$4,$5,'failed')
     ON CONFLICT (razorpay_payment_id) DO NOTHING`,
    [
      userId,
      subscriptionId,
      rzPay.id,
      rzPay.amount,
      String(rzPay.currency ?? 'INR').toUpperCase(),
    ]
  )
}
