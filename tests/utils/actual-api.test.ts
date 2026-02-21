import { test, expect, describe, afterEach } from '@jest/globals';
import { ActualApiClient } from '../../src/utils/actual-api';
import { loadConfig } from '../../src/utils/config';
import { Budget } from '../../src/utils/types';

describe('Actual API Integration Tests', () => {
    let apiClient: ActualApiClient | null = null;

    afterEach(async () => {
        // Clean up API connection after each test
        if (apiClient) {
            await apiClient.close();
            apiClient = null;
        }
    });

    test('should initialize API client, get remote budgets, download first budget, and close connection', async () => {
        const config = loadConfig();

        // Initialize the Actual API client
        console.log('Initializing Actual API client...');
        apiClient = await ActualApiClient.initialize(config.actual);
        expect(apiClient).toBeDefined();
        expect(apiClient.getCurrentBudget()).toBeNull(); // No budget loaded initially

        // Get remote budgets from the server
        console.log('Fetching remote budgets...');
        const remoteBudgets: Budget[] = await apiClient.getRemoteBudgets();
        expect(remoteBudgets).toBeDefined();
        expect(Array.isArray(remoteBudgets)).toBe(true);

        // Verify we have at least one budget to work with
        expect(remoteBudgets.length).toBeGreaterThan(0);
        console.log(`Found ${remoteBudgets.length} remote budget(s)`);

        // Get the first budget
        const firstBudget = remoteBudgets[0];
        expect(firstBudget).toBeDefined();
        expect(firstBudget.groupId).toBeDefined();
        expect(firstBudget.name).toBeDefined();
        console.log(`First budget: ${firstBudget.name} (ID: ${firstBudget.groupId})`);

        // Download and open the first budget
        console.log('Downloading first budget...');
        await apiClient.downloadBudget(firstBudget);

        // Verify the budget is now loaded
        const currentBudget = apiClient.getCurrentBudget();
        expect(currentBudget).toBeDefined();
        expect(currentBudget!.groupId).toBe(firstBudget.groupId);
        expect(currentBudget!.name).toBe(firstBudget.name);

        // Get accounts from the downloaded budget to verify it's working
        console.log('Getting accounts from downloaded budget...');
        const accounts = await apiClient.getBudgetAccounts();
        expect(accounts).toBeDefined();
        expect(Array.isArray(accounts)).toBe(true);
        console.log(`Found ${accounts.length} account(s) in budget`);

        // Sync the budget to ensure all operations are persisted
        console.log('Syncing budget...');
        await apiClient.syncBudget();

        // Close the API connection (will be done in afterEach as well)
        console.log('Closing API connection...');
        await apiClient.close();

        console.log('Integration test completed successfully');
    }, 30000); // 30 second timeout for this integration test
});

describe('Actual API Unit Tests', () => {
    // TODO: Add unit tests for individual ActualApiClient methods
    // e.g., testing error handling, edge cases, etc.
});
