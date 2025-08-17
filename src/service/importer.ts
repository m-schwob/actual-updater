import { ActualApiClient } from '../utils/actual-api';
import { utils } from '@actual-app/api';
import { TransactionTypes } from 'israeli-bank-scrapers/lib/transactions';
import { TransactionsAccountLink } from '../utils/types';
import type { ImportTransactionEntity } from '@actual-app/api/@types/loot-core/src/types/models/import-transaction';

/**
 * Map scraped transactions to Actual transaction format
 * @param scrapedAccountTransactions - The account transactions from the scraper
 * @returns Array of mapped Actual transactions
 */
function mapTransactions(scrapedAccountTransactions: TransactionsAccountLink): ImportTransactionEntity[] {
    const actualTransactions: ImportTransactionEntity[] = [];

    for (const transaction of scrapedAccountTransactions.scrapedTransactions.txns) {
        // Create notes from memo and installments
        const notes: string[] = [];
        if (transaction.type === TransactionTypes.Installments && transaction.installments) {
            notes.push(`${transaction.installments.number}/${transaction.installments.total}`);
        }
        if (transaction.memo) notes.push(transaction.memo);

        // Map transaction fields to Actual format
        const mapped: ImportTransactionEntity = {
            account: scrapedAccountTransactions.actualAccountId,
            date: transaction.date.split('T')[0] || '',
            amount: utils.integerToAmount(transaction.chargedAmount),
            payee_name: transaction.description,
            imported_payee: transaction.description,
            notes: notes.join(', '),
            imported_id: (transaction.identifier?.toString() as any),
            cleared: false,
        };

        actualTransactions.push(mapped);
    }

    return actualTransactions;
}


/**
 * Import linked scraped accounts into Actual using the provided ActualApiClient.
 * @param apiClient - The Actual API client instance
 * @param linkedScrappedAccounts - Array of linked scraped accounts with transactions
 */
export async function importScrapedTransactions(apiClient: ActualApiClient, linkedScrappedAccounts: TransactionsAccountLink[]) {
    for (const scrapedAccountTransactions of linkedScrappedAccounts) {
        try {
            const transactions = mapTransactions(scrapedAccountTransactions);

            if (transactions.length === 0) {
                console.log(`No transactions to import for account ${scrapedAccountTransactions.actualAccountId}`);
                continue;
            }

            await apiClient.importTransactions(scrapedAccountTransactions.actualAccountId as string, transactions as any[]);
        } catch (error) {
            console.error(`Failed to import for account ${scrapedAccountTransactions.actualAccountId}:`, error);
        }
    }
}
