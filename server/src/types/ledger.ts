export interface LedgerStatementInput {
    business_id: string;
    party_id?: string;
    from_date?: string;
    to_date?: string;
    page?: number;
    limit?: number;
}

export interface LedgerParams {
    business_id: string;
    [key: string]: string;
}

export interface LedgerStatementQueryRaw {
    [key: string]: string | undefined;
    party_id?: string;
    from_date?: string;
    to_date?: string;
    page?: string;
    limit?: string;
}
