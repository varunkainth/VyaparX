export type PartyType = "customer" | "supplier" | "both";
export type OpeningBalanceType = "receivable" | "payable" | "none";

export interface CreatePartyInput {
    business_id: string;
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

export interface CreatePartyRecordInput extends Omit<CreatePartyInput, "opening_balance" | "opening_balance_type"> {
    opening_balance: number;
    opening_balance_type: OpeningBalanceType;
    current_balance: number;
}

export type CreatePartyBody = Omit<CreatePartyInput, "business_id">;

export interface PartyParams {
    business_id: string;
    party_id: string;
    [key: string]: string;
}

export interface PartyListQuery {
    include_inactive?: "true" | "false";
}
