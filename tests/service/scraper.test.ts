import { jest } from '@jest/globals';
import { ScraperCredentials } from 'israeli-bank-scrapers';
import { TransactionsAccount, Transaction, TransactionTypes, TransactionStatuses } from 'israeli-bank-scrapers/lib/transactions';
import { ScraperScrapingResult } from 'israeli-bank-scrapers/lib/scrapers/interface';

// Mock data for testing
const mockTransaction: Transaction = {
    type: TransactionTypes.Normal,
    identifier: '12345',
    date: '2023-08-01T00:00:00.000Z',
    processedDate: '2023-08-02T00:00:00.000Z',
    originalAmount: 100.50,
    originalCurrency: 'ILS',
    chargedAmount: 100.50,
    chargedCurrency: 'ILS',
    description: 'Test Transaction',
    memo: 'Test memo',
    status: TransactionStatuses.Completed,
    category: 'Food'
};

const mockTransactionsAccount: TransactionsAccount = {
    accountNumber: '12345678',
    balance: 1500.75,
    txns: [mockTransaction]
};

const mockSuccessfulScrapeResult: ScraperScrapingResult = {
    success: true,
    accounts: [mockTransactionsAccount],
    futureDebits: []
};

const mockFailedScrapeResult: ScraperScrapingResult = {
    success: false,
    errorType: 'INVALID_PASSWORD' as any,
    errorMessage: 'Invalid credentials provided'
};

const mockEmptyAccountsScrapeResult: ScraperScrapingResult = {
    success: true,
    accounts: undefined
};

// Mock only the scrape function
const mockScrapeFunction = jest.fn<(credentials: ScraperCredentials) => Promise<ScraperScrapingResult>>();

describe("Integration Tests", () => {
    // Tests that take real credentials manually
    test("Visa Cal", async () => {
        // TODO: Implement 
    });

    test("Beinleumi", async () => {
        // TODO: Implement
    });

    test("Max", async () => {
        // TODO: Implement
    });
});

describe("Unit Tests", () => {
    // Unit tests using mocked scrape function
    describe("Visa Cal", () => {
        test("sunny day", async () => {
            // TODO: Implement
        });
    });

    describe("Beinleumi", () => {
        test("sunny day", async () => {
            // TODO: Implement
        });
    });

    describe("Max", () => {
        test("sunny day", async () => {
            // TODO: Implement
        });
    });
});
