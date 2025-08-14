import { CompanyTypes, createScraper, ScraperCredentials, ScraperOptions } from 'israeli-bank-scrapers';
import { TransactionsAccount } from 'israeli-bank-scrapers/lib/transactions';
import { Account } from '../utils/types';

interface ScrapingConfig {
    startDate: Date;
    showBrowser?: boolean;
}

async function getAccountResults(options: ScraperOptions, credentials: ScraperCredentials): Promise<TransactionsAccount[]> {
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


export async function scrapeAllAccounts(accounts: Account[], config: ScrapingConfig): Promise<TransactionsAccount[]> {
    let transactionsAccount: TransactionsAccount[] = [];

    for (const account of accounts) {
        try {
            // Validate bank name against CompanyTypes enum
            const bankName = account.financial_provider as keyof typeof CompanyTypes;
            if (!CompanyTypes[bankName]) {
                throw new Error(`Unsupported bank: ${account.financial_provider}`);
            }

            const options: ScraperOptions = {
                companyId: CompanyTypes[bankName],
                startDate: config.startDate,
                showBrowser: config.showBrowser || false,
            };

            const credentials: ScraperCredentials = {
                username: account.username,
                password: account.password || '',
            };

            console.log(`Scraping account ${account.actual_account_id} from ${account.financial_provider}`);
            const accounts = await getAccountResults(options, credentials);
            transactionsAccount.push(...accounts);
        } catch (error) {
            console.error(`Failed to scrape account ${account.actual_account_id}: ${error instanceof Error ? error.message : String(error)}`);
            // Continue with other accounts instead of failing completely
        }
    }

    return transactionsAccount;
}
