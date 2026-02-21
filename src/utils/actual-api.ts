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
 * Decorator to ensure a budget is loaded before executing a method
 */
function requireBudgetLoaded(_target: any, _propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    descriptor.value = function (...args: any[]) {
        const self = this as ActualApiClient;
        if (!self.getCurrentBudget()) {
            throw new Error('No budget is currently loaded. Call downloadBudget() first.');
        }
        return originalMethod.apply(self, args);
    };
}

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
     * @param config - Configuration object containing server URL, admin token, and data directory
     * @returns Promise that resolves to an authenticated ActualApiClient instance
     * @throws Error if connection to Actual Budget server fails or authentication fails
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
     * @returns Promise that resolves to an array of remote Budget objects
     * @throws Error if fetching budgets from server fails
     */
    async getRemoteBudgets(): Promise<Budget[]> {
        try {
            console.log('Fetching remote budgets...');

            // Get list of budgets from the server
            const budgets = await api.getBudgets();

            // Filter for remote budgets only (have state field)
            const remoteBudgets = budgets.filter((budget: any) => budget.state);

            console.log(`Retrieved ${remoteBudgets.length} unique remote budgets from server`);
            console.log(`Budget names: ${remoteBudgets.map(b => b.name).join(', ')}`);

            return remoteBudgets;

        } catch (error) {
            console.error('Failed to get remote budgets:', error);
            throw new Error(`Failed to retrieve budgets from server: ${error}`);
        }
    }

    /**
     * Download and open a specific budget
     * @param budget - The Budget object to download and open
     * @returns Promise that resolves when budget is successfully downloaded and opened
     * @throws Error if downloading the budget fails or recovery from sync error fails
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
        }

        // Save current budget state
        this.currentBudget = budget;
        console.log(`Successfully downloaded budget: ${budget.name}`);
    }

    /**
     * Get all accounts from the currently opened budget
     * Requires a budget to be downloaded first via downloadBudget()
     * @returns Promise that resolves to an array of ActualAccount objects
     * @throws Error if no budget is loaded or if retrieving accounts fails
     */
    @requireBudgetLoaded
    async getBudgetAccounts(): Promise<ActualAccount[]> {
        try {
            console.log(`Getting accounts for budget: ${this.currentBudget!.name}`);
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
     * @returns The currently loaded Budget object, or null if no budget is loaded
     */
    getCurrentBudget(): Budget | null {
        return this.currentBudget;
    }

    /**
     * Sync the current budget to save all changes
     * Requires a budget to be downloaded first via downloadBudget()
     * @returns Promise that resolves when budget sync is complete
     * @throws Error if no budget is loaded or if syncing fails
     */
    @requireBudgetLoaded
    async syncBudget(): Promise<void> {
        try {
            console.log(`Syncing budget: ${this.currentBudget!.name}`);
            await api.sync();
            console.log(`Budget synced successfully: ${this.currentBudget!.name}`);
        } catch (error) {
            console.error('Failed to sync budget:', error);
            throw new Error(`Failed to sync budget: ${error}`);
        }
    }

    /**
     * Import transactions into an account in the currently opened budget
     * Requires a budget to be downloaded first via downloadBudget()
     * @param accountId - The ID of the account to import transactions into
     * @param transactions - Array of transaction objects to import
     * @returns Promise that resolves when transactions are successfully imported
     * @throws Error if no budget is loaded or if importing transactions fails
     */
    @requireBudgetLoaded
    async importTransactions(accountId: string, transactions: any[]): Promise<void> {
        try {
            console.log(`Importing ${transactions.length} transactions into account ${accountId}`);
            await api.importTransactions(accountId, transactions);
            console.log(`Imported ${transactions.length} transactions into account ${accountId}`);
        } catch (error) {
            console.error(`Failed to import transactions into account ${accountId}:`, error);
            throw new Error(`Failed to import transactions into account ${accountId}: ${error}`);
        }
    }


    /**
     * Close the API connection and shutdown the Actual API
     * @returns Promise that resolves when the API connection is closed
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
     * @param budget - The Budget object that failed to sync
     * @returns Promise that resolves when recovery is complete and budget is re-downloaded
     * @throws Error if recovery process fails or re-download fails
     */
    private async recoverFromSyncError(budget: Budget): Promise<void> {
        try {
            console.log(`Attempting to recover from sync error for budget: ${budget.name}`);

            // Get local budgets to find the correct cache folder by groupId
            const localBudgets = await api.getBudgets();
            const matchingBudget = localBudgets.find((localBudget: Budget) =>
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
