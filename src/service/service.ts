/**
 * Main service orchestrator for Actual Updater
 * Handles the complete import workflow coordination
 */

import { ActualApiClient } from '../utils/actual-api';
import { ActualConfig } from '../utils/config';
import { ActualAccount, Budget, BudgetProvider, ScrapingOptions } from '../utils/types';
import { loadAccounts } from '../utils/db_interface/db_interface';
import { scrapeBudgetProviders } from './scraper';
import { importScrapedTransactions } from './importer';

/**
 * Main service class that orchestrates the entire import process
 */
export class ActualUpdaterService {
    private apiClient: ActualApiClient;
    private scrapingOptions: ScrapingOptions;

    private constructor(apiClient: ActualApiClient, scrapingOptions: ScrapingOptions) {
        this.apiClient = apiClient;
        this.scrapingOptions = scrapingOptions;
    }

    /**
     * Create and initialize a new ActualUpdaterService instance
     */
    static async create(apiConfig: ActualConfig, scrapingOptions: ScrapingOptions): Promise<ActualUpdaterService> {
        try {
            console.log('Initializing Actual Updater Service...');

            // Initialize the API client
            const apiClient = await ActualApiClient.initialize(apiConfig);
            console.log('Service initialized successfully');

            return new ActualUpdaterService(apiClient, scrapingOptions);
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
            // Get all available budgets
            const budgets = await this.apiClient.getRemoteBudgets();
            console.log(`Found ${budgets.length} budgets to process`);

            // Process each budget via helper
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
            const budgetAccounts = await this.apiClient.getBudgetAccounts();
            console.log(`Found ${budgetAccounts.length} accounts in budget: ${budget.name}`);

            if (budgetAccounts.length === 0) {
                console.log(`No accounts found in budget: ${budget.name}, skipping`);
                return;
            }

            // Load budget providers from the database
            const budgetProviders = await this.loadBudgetProviders(budget, budgetAccounts);

            // Scrape providers data for the listed accounts
            console.log(`Scraping providers transactions...`);
            const linkedScrappedAccounts = await scrapeBudgetProviders(budgetProviders, this.scrapingOptions);

            // Import scraped transactions into Actual for this budget
            console.log(`Importing scraped transactions...`);
            await importScrapedTransactions(this.apiClient, linkedScrappedAccounts);

            // Sync the budget to save any changes
            await this.apiClient.syncBudget();

            console.log(`Completed processing budget: ${budget.name}`);

        } catch (error) {
            console.error(`Failed to process budget ${budget.name}:`, error);
            // Continue with other budgets even if one fails
        }
    }

    /**
     * Load all providers from the database
     */
    private async loadBudgetProviders(budget: Budget, budgetAccounts: ActualAccount[]): Promise<BudgetProvider[]> {
        // Extract account IDs for database lookup
        const budgetAccountIds = budgetAccounts.map(account => account.id);

        // Load stored credentials for these accounts from database
        console.log(`Loading stored credentials for ${budgetAccountIds.length} accounts...`);
        let budgetProviders: BudgetProvider[] = [];

        try {
            budgetProviders = await loadAccounts(budget.groupId, budgetAccountIds);
            console.log(`Found ${budgetProviders.length} accounts with stored credentials`);
        } catch (error) {
            console.warn(`Failed to load accounts from database for budget ${budget.name}:`, error);
        }
        return budgetProviders;
    }
}
