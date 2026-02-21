import { jest } from '@jest/globals';

// Mock only the scrape function (shared per-test control via mockResolvedValueOnce)
const mockScrapeFunction = jest.fn() as jest.MockedFunction<(credentials: ScraperCredentials) => Promise<ScraperScrapingResult>>;

// Install module-scope mock so createScraper() created by the module returns our mock
jest.mock('israeli-bank-scrapers', () => {
    const actual = jest.requireActual('israeli-bank-scrapers');
    return Object.assign({}, actual, {
        createScraper: () => ({ scrape: mockScrapeFunction })
    });
});

import { CompanyTypes, ScraperCredentials, SCRAPERS } from 'israeli-bank-scrapers';
import { ScraperScrapingResult } from 'israeli-bank-scrapers/lib/scrapers/interface';
import { BudgetProvider } from '../../src/utils/types';
import { scrapeBudgetProviders } from '../../src/service/scraper';



describe("Integration Tests", () => {
    // test multiple scrapers with mocking
});

describe("Unit Tests", () => {
    // Unit tests using mocked scrape function
    describe("Visa Cal", () => {
        test("sunny day - build budgetProviders object", async () => {
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
            const providerName = CompanyTypes.visaCal;
            const credentials = { username: 'testuser', password: 'testpass' };
            const options = { scrapeSince: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } as any;

            const budgetProviders: BudgetProvider[] = [
                {
                    budgetId: 'manual-test-budget',
                    financialProvider: providerName,
                    accountsMapping: [
                        {
                            actualAccountId: `${providerName}-manual-test-account`,
                            financialProviderAccountId: '12345678'
                        }
                    ],
                    financialProviderUsername: credentials.username,
                    financialProviderPassword: credentials.password
                }
            ];

            // set a single-call return for this test
            const scrapeResult = {
                success: true,
                accounts: [
                    { accountNumber: '12345678', txns: [{ date: '2025-09-01', amount: -100, description: 'Test' }] }
                ]
            } as unknown as ScraperScrapingResult;

            mockScrapeFunction.mockResolvedValueOnce(scrapeResult);

            // call function under test
            const linked = await scrapeBudgetProviders(budgetProviders, { scrapeSince: new Date() });

            // optional: set default for remaining calls
            // mockScrapeFunction.mockResolvedValue({ success: true, accounts: [] } as any);

            // cleanup between tests
            mockScrapeFunction.mockClear();
        });
    });
});
