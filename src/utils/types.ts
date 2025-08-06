/**
 * TypeScript type definitions for Actual Budget entities
 * Re-exports official types from @actual-app/api
 */

// Import official types from @actual-app/api
import type { APIFileEntity, APIAccountEntity } from '@actual-app/api/@types/loot-core/src/server/api-models';

// Re-export with cleaner names
export type Budget = APIFileEntity;
export type Account = APIAccountEntity;
