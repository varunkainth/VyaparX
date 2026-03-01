import { ledgerRepository } from "../repository/ledger.repository";
import type { LedgerStatementInput } from "../types/ledger";

export async function getLedgerStatement(input: LedgerStatementInput) {
    return ledgerRepository.getStatement(input);
}
