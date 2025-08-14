/**
 * TypeScript type definitions for Actual Budget entities and local database entities
 * Re-exports official types from @actual-app/api and defines local types
 */

// Import official types from @actual-app/api
import type { APIFileEntity, APIAccountEntity } from '@actual-app/api/@types/loot-core/src/server/api-models';

// Re-export with cleaner names for Actual Budget entities
export type Budget = APIFileEntity;
export type ActualAccount = APIAccountEntity;

/**
 * Local database account data structure with bank credentials
 */
export interface Account {
    actual_account_id: string;
    financial_provider: string;
    financial_provider_account: string;
    username: string;
    password?: string;
}
