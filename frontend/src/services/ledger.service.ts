import apiClient from "@/lib/api-client";
import type { LedgerEntry, LedgerStatementQuery } from "@/types/ledger";

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

// Transform API response to ensure numeric fields are numbers
function transformLedgerEntry(entry: any): LedgerEntry {
  return {
    ...entry,
    debit: typeof entry.debit === 'string' ? parseFloat(entry.debit) : entry.debit,
    credit: typeof entry.credit === 'string' ? parseFloat(entry.credit) : entry.credit,
    balance_after: typeof entry.balance_after === 'string' ? parseFloat(entry.balance_after) : entry.balance_after,
  };
}

export const ledgerService = {
  async getLedgerStatement(
    businessId: string,
    query?: LedgerStatementQuery
  ): Promise<PaginatedResponse<LedgerEntry>> {
    const params = new URLSearchParams();
    
    if (query?.party_id) params.append("party_id", query.party_id);
    if (query?.from_date) params.append("from_date", query.from_date);
    if (query?.to_date) params.append("to_date", query.to_date);
    if (query?.page) params.append("page", String(query.page));
    if (query?.limit) params.append("limit", String(query.limit));

    const url = `/api/v1/businesses/${businessId}/ledger/statement${params.toString() ? `?${params.toString()}` : ""}`;
    const response = await apiClient.get<ApiResponse<PaginatedResponse<any>>>(url);
    
    return {
      ...response.data.data,
      items: response.data.data.items.map(transformLedgerEntry),
    };
  },
};
