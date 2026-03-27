export type EntryType = "invoice" | "payment" | "opening_balance" | "adjustment";
export type ReferenceType = "invoice" | "payment" | "adjustment";

export interface LedgerEntry {
  id: string;
  business_id: string;
  party_id: string;
  party_name: string;
  entry_type: EntryType;
  debit: number;
  credit: number;
  balance_after: number;
  reference_type: ReferenceType | null;
  reference_id: string | null;
  description: string;
  entry_date: string;
  created_by: string | null;
  created_at: string;
}

export interface LedgerStatementQuery {
  party_id?: string;
  from_date?: string;
  to_date?: string;
  page?: number;
  limit?: number;
}

export interface LedgerStatementResponse {
  items: LedgerEntry[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}
