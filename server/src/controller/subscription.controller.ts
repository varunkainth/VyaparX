import type { Request, Response, NextFunction } from 'express'
import { AppError } from '../utils/appError'
import { ERROR_CODES } from '../constants/errorCodes'
import { sendSuccess } from '../utils/responseHandler'
import {
  createSubscriptionSession,
  listSubscriptionPayments,
  getSubscriptionStatus,
  cancelSubscription,
  syncSubscriptionStatus,
} from '../services/subscription.service'

type BillingCycle = 'monthly' | 'annual'

type CreateSessionBody = {
  billing_cycle?: string
  coupon_code?: string
}

const isBillingCycle = (value: string): value is BillingCycle =>
  value === 'monthly' || value === 'annual'

export async function createSession(
  req: Request<unknown, unknown, CreateSessionBody>,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.user?.id) {
      throw new AppError('Authentication required', 401, ERROR_CODES.UNAUTHORIZED)
    }

    const { billing_cycle, coupon_code } = req.body
    if (!billing_cycle || !isBillingCycle(billing_cycle)) {
      throw new AppError(
        'billing_cycle must be monthly or annual',
        400,
        ERROR_CODES.BAD_REQUEST
      )
    }

    if (coupon_code !== undefined && typeof coupon_code !== 'string') {
      throw new AppError('coupon_code must be a string', 400, ERROR_CODES.BAD_REQUEST)
    }

    const normalizedCouponCode = coupon_code?.trim() || undefined

    const result = await createSubscriptionSession(
      req.user.id,
      req.user.email ?? '',
      billing_cycle,
      normalizedCouponCode
    )

    return sendSuccess(res, {
      statusCode: 201,
      message: 'Subscription session created',
      data: result,
    })
  } catch (err) { next(err) }
}

export async function getStatus(
  req: Request, res: Response, next: NextFunction
) {
  try {
    if (!req.user?.id) {
      throw new AppError('Authentication required', 401, ERROR_CODES.UNAUTHORIZED)
    }

    const status = await getSubscriptionStatus(req.user.id)

    return sendSuccess(res, {
      message: 'Subscription status fetched',
      data: status,
    })
  } catch (err) { next(err) }
}

export async function getPayments(
  req: Request, res: Response, next: NextFunction
) {
  try {
    if (!req.user?.id) {
      throw new AppError('Authentication required', 401, ERROR_CODES.UNAUTHORIZED)
    }

    const payments = await listSubscriptionPayments(req.user.id)

    return sendSuccess(res, {
      message: 'Billing history fetched',
      data: payments,
    })
  } catch (err) { next(err) }
}

export async function cancel(
  req: Request, res: Response, next: NextFunction
) {
  try {
    if (!req.user?.id) {
      throw new AppError('Authentication required', 401, ERROR_CODES.UNAUTHORIZED)
    }

    await cancelSubscription(req.user.id)

    return sendSuccess(res, {
      message: 'Subscription will cancel at end of billing period.',
    })
  } catch (err) { next(err) }
}

export async function syncStatus(
  req: Request, res: Response, next: NextFunction
) {
  try {
    if (!req.user?.id) {
      throw new AppError('Authentication required', 401, ERROR_CODES.UNAUTHORIZED)
    }

    const status = await syncSubscriptionStatus(req.user.id)

    return sendSuccess(res, {
      message: 'Subscription status synced from Razorpay',
      data: status,
    })
  } catch (err) { next(err) }
}