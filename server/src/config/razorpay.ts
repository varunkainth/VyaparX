import Razorpay from 'razorpay'

const keyId = process.env.RAZORPAY_KEY_ID ?? ''
const keySecret = process.env.RAZORPAY_KEY_SECRET ?? ''

export const razorpay = new Razorpay({
  key_id: keyId,
  key_secret: keySecret,
})

export const RAZORPAY_PLANS: Record<'monthly' | 'annual', string> = {
  monthly: process.env.RAZORPAY_PLAN_ID_MONTHLY ?? '',
  annual: process.env.RAZORPAY_PLAN_ID_ANNUAL ?? '',
}

export const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET ?? ''

type RazorpayMode = 'test' | 'live' | 'unknown'

type RazorpayHealth = {
  ready: boolean
  key_id_present: boolean
  key_secret_present: boolean
  webhook_secret_present: boolean
  monthly_plan_present: boolean
  annual_plan_present: boolean
  key_mode: RazorpayMode
  plan_modes: {
    monthly: RazorpayMode
    annual: RazorpayMode
  }
  issues: string[]
}

const detectMode = (value: string): RazorpayMode => {
  if (value.startsWith('rzp_test_') || value.startsWith('plan_test_')) {
    return 'test'
  }
  if (value.startsWith('rzp_live_') || value.startsWith('plan_live_')) {
    return 'live'
  }
  return 'unknown'
}

export function getRazorpayHealth(): RazorpayHealth {
  const issues: string[] = []

  const keyIdPresent = keyId.length > 0
  const keySecretPresent = keySecret.length > 0
  const webhookSecretPresent = RAZORPAY_WEBHOOK_SECRET.length > 0
  const monthlyPlanPresent = RAZORPAY_PLANS.monthly.length > 0
  const annualPlanPresent = RAZORPAY_PLANS.annual.length > 0

  if (!keyIdPresent) issues.push('RAZORPAY_KEY_ID is missing')
  if (!keySecretPresent) issues.push('RAZORPAY_KEY_SECRET is missing')
  if (!monthlyPlanPresent) issues.push('RAZORPAY_PLAN_ID_MONTHLY is missing')
  if (!annualPlanPresent) issues.push('RAZORPAY_PLAN_ID_ANNUAL is missing')
  if (!webhookSecretPresent) issues.push('RAZORPAY_WEBHOOK_SECRET is missing')

  if (monthlyPlanPresent && !RAZORPAY_PLANS.monthly.startsWith('plan_')) {
    issues.push('RAZORPAY_PLAN_ID_MONTHLY must start with plan_')
  }
  if (annualPlanPresent && !RAZORPAY_PLANS.annual.startsWith('plan_')) {
    issues.push('RAZORPAY_PLAN_ID_ANNUAL must start with plan_')
  }

  const keyMode = detectMode(keyId)
  const monthlyMode = detectMode(RAZORPAY_PLANS.monthly)
  const annualMode = detectMode(RAZORPAY_PLANS.annual)

  if (keyMode !== 'unknown' && monthlyMode !== 'unknown' && keyMode !== monthlyMode) {
    issues.push('RAZORPAY_KEY_ID mode does not match RAZORPAY_PLAN_ID_MONTHLY mode')
  }
  if (keyMode !== 'unknown' && annualMode !== 'unknown' && keyMode !== annualMode) {
    issues.push('RAZORPAY_KEY_ID mode does not match RAZORPAY_PLAN_ID_ANNUAL mode')
  }

  return {
    ready: issues.length === 0,
    key_id_present: keyIdPresent,
    key_secret_present: keySecretPresent,
    webhook_secret_present: webhookSecretPresent,
    monthly_plan_present: monthlyPlanPresent,
    annual_plan_present: annualPlanPresent,
    key_mode: keyMode,
    plan_modes: {
      monthly: monthlyMode,
      annual: annualMode,
    },
    issues,
  }
}

export function validateRazorpayConfig(): void {
  if (!keyId || !keySecret) {
    throw new Error('RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set')
  }

  if (!RAZORPAY_PLANS.monthly || !RAZORPAY_PLANS.annual) {
    throw new Error('RAZORPAY_PLAN_ID_MONTHLY and RAZORPAY_PLAN_ID_ANNUAL must be set')
  }
}
