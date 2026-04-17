export type PlanType = 'free' | 'pro'

export type Feature =
  | 'invite_members'
  | 'custom_templates'
  | 'gstr_export'
  | 'whatsapp_sharing'
  | 'recurring_invoices'
  | 'audit_log'
  | 'advanced_reports'

export type LimitType =
  | 'businesses'
  | 'invoices_per_month'
  | 'parties'
  | 'members_per_business'

export const PLAN_FEATURES: Record<PlanType, Record<Feature, boolean>> = {
  free: {
    invite_members: false,
    custom_templates: false,
    gstr_export: false,
    whatsapp_sharing: false,
    recurring_invoices: false,
    audit_log: false,
    advanced_reports: false,
  },
  pro: {
    invite_members: true,
    custom_templates: true,
    gstr_export: true,
    whatsapp_sharing: true,
    recurring_invoices: true,
    audit_log: true,
    advanced_reports: true,
  },
}

export const PLAN_LIMITS: Record<PlanType, Record<LimitType, number>> = {
  free: {
    businesses: 1,
    invoices_per_month: 50,
    parties: 5,
    members_per_business: 0,
  },
  pro: {
    businesses: Infinity,
    invoices_per_month: Infinity,
    parties: Infinity,
    members_per_business: 5,
  },
}
