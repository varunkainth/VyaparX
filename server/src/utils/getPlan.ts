
import { getSubscriptionByUserId } from '../repository/subscription.repository'
import type { PlanType } from '../config/planFeatures'
import {
  buildUserPlanCacheKey,
  getOrSetCache,
  invalidateUserPlanCache,
} from '../services/cache.service'

const CACHE_TTL = 300 // 5 minutes

export async function getPlan(userId: string): Promise<PlanType> {
  const cacheKey = await buildUserPlanCacheKey(userId)

  return getOrSetCache(cacheKey, CACHE_TTL, async () => {
    const sub = await getSubscriptionByUserId(userId)

    if (!sub) {
      // Should never happen due to trigger, but safe fallback
      return 'free'
    }

    return resolveEffectivePlan(sub)
  })
}

export async function bustPlanCache(userId: string): Promise<void> {
  await invalidateUserPlanCache(userId)
}

function resolveEffectivePlan(sub: {
  plan: 'free' | 'pro'
  status: string
  trial_ends_at: Date
  current_period_end: Date | null
  cancel_at_period_end: boolean
}): PlanType {
  const now = new Date()

  switch (sub.status) {
    case 'trialing':
      return sub.trial_ends_at > now ? 'pro' : 'free'

    case 'active':
      return sub.plan

    case 'cancelled':
      // Still pro until current period ends
      return sub.current_period_end && sub.current_period_end > now
        ? 'pro'
        : 'free'

    case 'past_due':
      // Grace period — still allow pro for now
      return 'pro'

    case 'expired':
    default:
      return 'free'
  }
}