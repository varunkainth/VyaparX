export type PartyType = "customer" | "supplier" | "both";
export type OpeningBalanceType = "receivable" | "payable" | "none";

export interface Party {
  id: string;
  business_id: string;
  name: string;
  party_type: PartyType;
  gstin?: string | null;
  pan?: string | null;
  state_code?: string | null;
  state?: string | null;
  address?: string | null;
  city?: string | null;
  pincode?: string | null;
  phone?: string | null;
  email?: string | null;
  opening_balance: number;
  opening_balance_type: OpeningBalanceType;
  current_balance: number;
  notes?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreatePartyInput {
  name: string;
  party_type: PartyType;
  gstin?: string;
  pan?: string;
  state_code?: string;
  state?: string;
  address?: string;
  city?: string;
  pincode?: string;
  phone?: string;
  email?: string;
  opening_balance?: number;
  opening_balance_type?: OpeningBalanceType;
  notes?: string;
}

export interface UpdatePartyInput {
  name?: string;
  party_type?: PartyType;
  gstin?: string;
  pan?: string;
  state_code?: string;
  state?: string;
  address?: string;
  city?: string;
  pincode?: string;
  phone?: string;
  email?: string;
  opening_balance?: number;
  opening_balance_type?: OpeningBalanceType;
  notes?: string;
  is_active?: boolean;
}

export interface ListPartiesQuery {
  include_inactive?: "true" | "false";
}
