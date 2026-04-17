import { PLAN_LIMITS, type PlanType, type LimitType } from '../config/planFeatures'
import {
  getInvoiceCountThisMonth,
  getPartyCount,
  getBusinessCount,
  getMemberCount,
} from '../repository/subscription.repository'

export class PlanLimitError extends Error {
  readonly statusCode = 402
  readonly upgrade_required = true
  readonly limit_type: LimitType
  readonly current: number
  readonly max: number

  constructor(limitType: LimitType, current: number, max: number) {
    super(`Plan limit reached for '${limitType}': ${current}/${max}.`)
    this.name = 'PlanLimitError'
    this.limit_type = limitType
    this.current = current
    this.max = max
  }
}

export async function checkLimit(
  plan: PlanType,
  limitType: LimitType,
  context: { userId?: string; businessId?: string }
): Promise<void> {
  const max = PLAN_LIMITS[plan][limitType]
  if (max === Infinity) return

  let current: number

  switch (limitType) {
    case 'invoices_per_month':
      current = await getInvoiceCountThisMonth(context.businessId!)
      break
    case 'parties':
      current = await getPartyCount(context.businessId!)
      break
    case 'businesses':
      current = await getBusinessCount(context.userId!)
      break
    case 'members_per_business':
      current = await getMemberCount(context.businessId!)
      break
  }

  if (current >= max) {
    throw new PlanLimitError(limitType, current, max)
  }
}