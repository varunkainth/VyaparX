export type BillingCycle = "monthly" | "annual";

export type SubscriptionStatusType =
  | "trialing"
  | "active"
  | "past_due"
  | "cancelled"
  | "expired";

export interface SubscriptionStatus {
  plan: "free" | "pro";
  status: SubscriptionStatusType;
  billing_cycle: BillingCycle | null;
  trial_ends_at: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  coupon_code?: string | null;
  discount_type?: "percent" | "flat" | null;
  discount_value?: number | null;
}

export interface CreateSubscriptionSessionInput {
  billing_cycle: BillingCycle;
  coupon_code?: string;
}

export interface CreateSubscriptionSessionResponse {
  subscription_id: string;
  razorpay_key: string;
}

export interface SubscriptionPaymentHistoryItem {
  id: string;
  razorpay_payment_id: string | null;
  razorpay_invoice_id: string | null;
  amount_paise: number;
  currency: string;
  status: "captured" | "failed";
  billing_period_start: string | null;
  billing_period_end: string | null;
  created_at: string;
}
