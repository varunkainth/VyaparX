import { PLAN_FEATURES, type PlanType, type Feature } from '../config/planFeatures'

export class PlanFeatureError extends Error {
  readonly statusCode = 403
  readonly upgrade_required = true
  readonly feature: Feature

  constructor(feature: Feature) {
    super(`Feature '${feature}' is not available on your current plan.`)
    this.name = 'PlanFeatureError'
    this.feature = feature
  }
}

export function checkFeature(plan: PlanType, feature: Feature): void {
  if (!PLAN_FEATURES[plan][feature]) {
    throw new PlanFeatureError(feature)
  }
}