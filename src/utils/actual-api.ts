/**
 * Actual Budget API utilities
 * Handles connection, authentication, and data operations with Actual Budget
 */

import * as api from '@actual-app/api';
import { Budget, ActualAccount } from './types';
import { ActualConfig } from './config';
import path from 'path';
import fs from 'fs';

/**
 * Actual Budget API client with state management
 */
export class ActualApiClient {
    private currentBudget: Budget | null = null;
    private apiDataDirectory: string;

    private constructor(apiDataDirectory: string) {
        // Private constructor for static factory pattern
        this.apiDataDirectory = apiDataDirectory;
    }
    /**
     * Initialize the Actual API with OIDC authentication and return client instance
     */
    static async initialize(config: ActualConfig): Promise<ActualApiClient> {
        try {
            console.log(`Connecting to Actual server at: ${config.actualServerUrl}`);

            // Initialize the API
            await api.init({
                dataDir: config.apiDataDirectory,
                serverURL: config.actualServerUrl,
            });

            // Authenticate with OIDC (required for admin access)
            console.log('Authenticating with OIDC token...');
            await api.internal.send('subscribe-set-token', { token: config.adminToken });

            const user = await api.internal.send('subscribe-get-user');
            console.log(`Authenticated as: ${user.displayName}`);

            console.log('Successfully connected to Actual Budget server');

            // Create and return the client instance
            return new ActualApiClient(config.apiDataDirectory);

        } catch (error) {
            console.error('Failed to initialize Actual API:', error);
            throw new Error(`Failed to connect to Actual Budget server: ${error}`);
        }
    }

    /**
     * Get list of all remote budgets from the server
     */
    async getRemoteBudgets(): Promise<Budget[]> {
        try {
            console.log('Fetching remote budgets...');

            // Get list of budgets from the server
            const budgets = await api.getBudgets();

            // Filter for remote budgets only (have state field)
            const remoteBudgets = budgets.filter((budget: any) => budget.state);

            console.log(`Retrieved ${remoteBudgets.length} unique remote budgets from server`);
            console.log(JSON.stringify(remoteBudgets, null, 2));

            return remoteBudgets;

        } catch (error) {
            console.error('Failed to get remote budgets:', error);
            throw new Error(`Failed to retrieve budgets from server: ${error}`);
        }
    }

    /**
     * Download and open a specific budget
     */
    async downloadBudget(budget: Budget): Promise<void> {
        try {
            console.log(`Downloading budget: ${budget.name}`);

            // Download the budget (downloads if needed and opens it)
            await api.downloadBudget(budget.groupId);

        } catch (error) {
            console.error(`Failed to download budget ${budget.name}:`, error);
            console.log(`Failed to download budget ${budget.name}, attempting to recover...`);
            await this.recoverFromSyncError(budget);

            throw new Error(`Failed to download budget ${budget.name}: ${error}`);
        }

        // Save current budget state
        this.currentBudget = budget;
        console.log(`Successfully downloaded budget: ${budget.name}`);
    }

    /**
     * Get all accounts from the currently opened budget
     */
    async getBudgetAccounts(): Promise<ActualAccount[]> {
        try {
            if (!this.currentBudget) {
                throw new Error('No budget is currently loaded. Call downloadBudget() first.');
            }

            console.log(`Getting accounts for budget: ${this.currentBudget.name}`);

            // Get accounts from the opened budget
            const accounts = await api.getAccounts();

            console.log(`Retrieved ${accounts.length} accounts from budget`);

            return accounts;

        } catch (error) {
            console.error(`Failed to get accounts:`, error);
            throw new Error(`Failed to retrieve accounts: ${error}`);
        }
    }

    /**
     * Get the currently loaded budget
     */
    getCurrentBudget(): Budget | null {
        return this.currentBudget;
    }

    /**
     * Sync the current budget to save all changes
     */
    async syncBudget(): Promise<void> {
        try {
            if (!this.currentBudget) {
                console.warn('No budget loaded, skipping sync');
                return;
            }

            console.log(`Syncing budget: ${this.currentBudget.name}`);
            await api.sync();
            console.log(`Budget synced successfully: ${this.currentBudget.name}`);

        } catch (error) {
            console.error('Failed to sync budget:', error);
            throw new Error(`Failed to sync budget: ${error}`);
        }
    }

    /**
     * Import transactions into an account in the currently opened budget
     */
    async importTransactions(accountId: string, transactions: any[]): Promise<void> {
        try {
            if (!this.currentBudget) {
                throw new Error('No budget is currently loaded. Call downloadBudget() first.');
            }

            console.log(`Importing ${transactions.length} transactions into account ${accountId}`);
            await api.importTransactions(accountId, transactions);
            console.log(`Imported ${transactions.length} transactions into account ${accountId}`);
        } catch (error) {
            console.error(`Failed to import transactions into account ${accountId}:`, error);
            throw new Error(`Failed to import transactions into account ${accountId}: ${error}`);
        }
    }


    /**
     * Close the API connection
     */
    async close(): Promise<void> {
        try {
            await api.shutdown();
            console.log('Actual API connection closed');
        } catch (error) {
            console.error('Error closing Actual API:', error);
        }
    }

    /**
     * Recover from sync error by clearing local cache and retrying download
     */
    private async recoverFromSyncError(budget: Budget): Promise<void> {
        try {
            console.log(`Attempting to recover from sync error for budget: ${budget.name}`);

            // Get local budgets to find the correct cache folder by groupId
            const localBudgets = await api.getBudgets();
            const matchingBudget = localBudgets.find((localBudget: any) =>
                localBudget.groupId === budget.groupId && localBudget.id != null
            );

            if (matchingBudget) {
                // The local budget ID is used as the folder name in budget-files
                const budgetFolderPath = path.join(this.apiDataDirectory, matchingBudget.id);

                if (fs.existsSync(budgetFolderPath)) {
                    console.log(`Removing corrupted cache directory: ${budgetFolderPath}`);
                    fs.rmSync(budgetFolderPath, { recursive: true, force: true });
                } else {
                    console.log(`Cache directory not found: ${budgetFolderPath}`);
                }
            } else {
                console.log(`Could not find local budget with groupId: ${budget.groupId}`);
            }

            // Now retry the download
            console.log(`Retrying download for budget: ${budget.name}`);
            await api.downloadBudget(budget.groupId);
        } catch (recoveryError) {
            console.error(`Failed to recover from sync error for budget ${budget.name}:`, recoveryError);
            throw new Error(`Failed to recover from sync error for budget ${budget.name}: ${recoveryError}`);
        }
    }
}
