import { CompanyTypes, createScraper, ScraperCredentials, ScraperOptions } from 'israeli-bank-scrapers';
import { TransactionsAccount } from 'israeli-bank-scrapers/lib/transactions';
import { BudgetProvider, AccountsLink, TransactionsAccountLink, ScrapingOptions } from '../utils/types';



async function scrapeFinancialProvider(options: ScraperOptions, credentials: ScraperCredentials): Promise<TransactionsAccount[]> {
    const scraper = createScraper(options);
    const scrapeResult = await scraper.scrape(credentials);
    if (scrapeResult.success) {
        if (scrapeResult.accounts != undefined) {
            scrapeResult.accounts.forEach((account) => {
                console.log(`found ${account.txns.length} transactions for account number ${account.accountNumber}`);
            });
            return scrapeResult.accounts;
        }
    }
    else {
        throw new Error(`${scrapeResult.errorType}: ${scrapeResult.errorMessage}`);
    }
    return [];
}

async function scrapeBudgetProviderAccounts(options: ScraperOptions, credentials: ScraperCredentials, accountMap: AccountsLink[]): Promise<TransactionsAccountLink[]> {
    const allScrapedAccounts = await scrapeFinancialProvider(options, credentials);

    const linkedScrappedAccounts: TransactionsAccountLink[] = [];

    for (const accountLink of accountMap) {
        const scrapedAccount = allScrapedAccounts.find(
            scrapedAccount => scrapedAccount.accountNumber === accountLink.financialProviderAccountId);

        if (scrapedAccount)
            linkedScrappedAccounts.push({
                actualAccountId: accountLink.actualAccountId,
                scrapedTransactions: scrapedAccount
            });
        else
            console.warn(`Account ${accountLink.financialProviderAccountId} not found in scraped accounts`);
    }

    return linkedScrappedAccounts;
}


export async function scrapeBudgetProviders(budgetProviders: BudgetProvider[], config: ScrapingOptions): Promise<TransactionsAccountLink[]> {
    let linkedScrappedAccounts: TransactionsAccountLink[] = [];

    for (const provider of budgetProviders) {
        try {
            // Validate bank name against CompanyTypes enum
            const bankName = provider.financialProvider as keyof typeof CompanyTypes;
            if (!CompanyTypes[bankName]) {
                throw new Error(`Unsupported bank: ${provider.financialProvider}`);
            }
            const options: ScraperOptions = {
                companyId: CompanyTypes[bankName],
                // TODO we need to make sure it is not before the minimum allowed time difference for the specific scraper
                startDate: config.scrapeSince,
            };

            const credentials: ScraperCredentials = {
                username: provider.financialProviderUsername,
                password: provider.financialProviderUsername || '',
            };

            console.log(`Scraping accounts for ${provider.financialProvider} (${provider.financialProviderUsername})`);

            const scrapedAccounts = await scrapeBudgetProviderAccounts(options, credentials, provider.accountsMapping);
            linkedScrappedAccounts.push(...scrapedAccounts);
        } catch (error) {
            console.error(`Failed to scrape accounts for provider ${provider.financialProvider} (${provider.financialProviderUsername}):`, error);
            // Log the error but do not throw to allow processing of other providers
        }
    }

    return linkedScrappedAccounts;
}
