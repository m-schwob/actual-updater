/**
 * Main service orchestrator for Actual Updater
 * Handles the complete import workflow coordination
 */

import { ActualApiClient } from '../utils/actual-api';
import { ActualConfig } from '../utils/config';
import { Budget, Account } from '../utils/types';
import { loadAccounts } from '../utils/db_interface/db_interface';

/**
 * Main service class that orchestrates the entire import process
 */
export class ActualUpdaterService {
    private apiClient: ActualApiClient;

    private constructor(apiClient: ActualApiClient) {
        this.apiClient = apiClient;
    }

    /**
     * Create and initialize a new ActualUpdaterService instance
     */
    static async create(apiConfig: ActualConfig): Promise<ActualUpdaterService> {
        try {
            console.log('Initializing Actual Updater Service...');

            // Initialize the API client
            const apiClient = await ActualApiClient.initialize(apiConfig);
            console.log('Service initialized successfully');

            return new ActualUpdaterService(apiClient);
        } catch (error) {
            console.error('Failed to initialize service:', error);
            throw error;
        }
    }

    /**
     * Run the complete import workflow
     */
    async start(): Promise<void> {
        try {
            // Run the main import workflow
            await this.runImportWorkflow();
        } catch (error) {
            console.error('Failed to start service:', error);
            throw error;
        } finally {
            // Always close the API connection
            console.log('Closing API connection...');
            await this.apiClient.close();
        }
    }

    /**
     * Main import workflow orchestration
     */
    private async runImportWorkflow(): Promise<void> {
        console.log('Starting import workflow...');

        try {
            // Step 1: Get all available budgets
            const budgets = await this.apiClient.getRemoteBudgets();
            console.log(`Found ${budgets.length} budgets to process`);

            // Step 2: Process each budget via helper
            await this.processEachBudget(budgets);

            console.log('\nImport workflow completed successfully');

        } catch (error) {
            console.error('Import workflow failed:', error);
            throw error;
        }
    }


    /**
     * Helper to log and process a single budget.
     * Separated from the main loop to improve readability and testability.
     */
    private async processEachBudget(budgets: Budget[]): Promise<void> {
        for (const [i, budget] of budgets.entries()) {
            console.log(`\n--- Processing budget ${i + 1}/${budgets.length} ---`);
            console.log(`Name: "${budget.name}"`);
            console.log(`SyncId: ${budget.groupId}`);
            const ownerUser = budget.usersWithAccess.find(user => user.userId === budget.owner);
            const ownerUserName = ownerUser ? ownerUser.userName : 'Unknown';
            console.log(`User Name: ${ownerUserName}`);

            await this.processBudget(budget);

            // Add delay between budgets to allow services to settle
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }


    /**
     * Process a single budget - get accounts and prepare for transaction import
     */
    private async processBudget(budget: Budget): Promise<void> {
        console.log(`Processing budget: ${budget.name}`);

        try {
            // Download the budget first
            await this.apiClient.downloadBudget(budget);

            // Get accounts for this budget
            const accounts = await this.apiClient.getBudgetAccounts();
            console.log(`Found ${accounts.length} accounts in budget: ${budget.name}`);

            // TODO: Add bank scraping and transaction import logic here
            // For now, just log the accounts
            accounts.forEach(account => {
                console.log(`  - Account: ${account.name} (${account.id})`);
            });

            // Sync the budget to save any changes
            await this.apiClient.syncBudget();

            console.log(`Completed processing budget: ${budget.name}`);

        } catch (error) {
            console.error(`Failed to process budget ${budget.name}:`, error);
            // Continue with other budgets even if one fails
        }
    }
}
