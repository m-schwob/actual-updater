/**
 * TypeScript type definitions for Actual Budget entities and local database entities
 * Re-exports official types from @actual-app/api and defines local types
 */

// Import official types from @actual-app/api
import type { APIFileEntity, APIAccountEntity } from '@actual-app/api/@types/loot-core/src/server/api-models';
import { TransactionsAccount } from 'israeli-bank-scrapers/lib/transactions';

// Re-export with cleaner names for Actual Budget entities
export type Budget = APIFileEntity;
export type ActualAccount = APIAccountEntity;

/**
 * Represent the Budget Provider data structure returned form the database interface
 */
export interface BudgetProvider {
    budgetId: string;
    financialProvider: string;
    accountsMapping: AccountsLink[];
    financialProviderUsername: string;
    financialProviderPassword?: string;
}

/**
 * Represents the Accounts Link structure returned from the database interface as part of BudgetProvider
 */
export interface AccountsLink {
    actualAccountId: string;
    financialProviderAccountId: string;
}

/**
 * Link between Actual accounts and scraped transactions
 */
export interface TransactionsAccountLink {
    actualAccountId: string;
    scrapedTransactions: TransactionsAccount;
}

/**
 * Configuration for scraping providers
 */
export interface ScrapingOptions {
    scrapeSince: Date;
}
