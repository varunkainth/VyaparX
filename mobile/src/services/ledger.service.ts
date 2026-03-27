import apiClient from "../lib/api-client";
import type { ApiResponse } from "../types/auth";
import type { LedgerEntry, LedgerStatementQuery, LedgerStatementResponse } from "../types/ledger";

function toNumber(value: unknown) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  return 0;
}

function transformLedgerEntry(entry: LedgerEntry): LedgerEntry {
  return {
    ...entry,
    debit: toNumber(entry.debit),
    credit: toNumber(entry.credit),
    balance_after: toNumber(entry.balance_after),
  };
}

export const ledgerService = {
  async getLedgerStatement(
    business_id: string,
    query?: LedgerStatementQuery,
  ): Promise<LedgerStatementResponse> {
    const response = await apiClient.get<ApiResponse<LedgerStatementResponse>>(
      `/api/v1/businesses/${business_id}/ledger/statement`,
      { params: query },
    );

    return {
      ...response.data.data,
      items: response.data.data.items.map(transformLedgerEntry),
    };
  },
};
