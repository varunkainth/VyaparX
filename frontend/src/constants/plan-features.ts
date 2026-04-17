export type BillingFeatureKey =
  | "advanced_reports"
  | "recurring_invoices"
  | "team_members"
  | "billing_history"
  | "invoice_branding"
  | "bulk_exports"
  | "automation"
  | "analytics_overview";

export type BillingFeatureDefinition = {
  label: string;
  description: string;
  proOnly: boolean;
};

export const BILLING_FEATURES: Record<BillingFeatureKey, BillingFeatureDefinition> = {
  advanced_reports: {
    label: "Advanced Reports",
    description: "Unlock deeper financial and stock reporting dashboards.",
    proOnly: true,
  },
  recurring_invoices: {
    label: "Recurring Invoices",
    description: "Schedule invoices automatically for repeat customers.",
    proOnly: true,
  },
  team_members: {
    label: "Team Members",
    description: "Invite and coordinate more collaborators.",
    proOnly: true,
  },
  billing_history: {
    label: "Billing History",
    description: "View and export detailed subscription payment history.",
    proOnly: true,
  },
  invoice_branding: {
    label: "Invoice Branding",
    description: "Customize invoice visuals and brand presentation.",
    proOnly: true,
  },
  bulk_exports: {
    label: "Bulk Exports",
    description: "Export large sets of business data at once.",
    proOnly: true,
  },
  automation: {
    label: "Automation",
    description: "Use more advanced automated workflows.",
    proOnly: true,
  },
  analytics_overview: {
    label: "Analytics Overview",
    description: "See the full analytics overview and trend breakdowns.",
    proOnly: true,
  },
};

export const BILLING_PRICE = {
  monthly: 999,
  annual: 9999,
};

export const formatINR = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
