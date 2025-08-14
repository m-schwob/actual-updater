import { CompanyTypes, createScraper, ScraperCredentials, ScraperOptions } from 'israeli-bank-scrapers';
import { TransactionsAccount } from 'israeli-bank-scrapers/lib/transactions';
import { Account } from '../utils/types';

interface ScrapingConfig {
    startDate: Date;
    showBrowser?: boolean;
}

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

async function scrapeAccounts(options: ScraperOptions, credentials: ScraperCredentials, financial_provider_accounts: string[]): Promise<TransactionsAccount[]> {
    const allAccounts = await scrapeFinancialProvider(options, credentials);

    // Filter to only return the specific accounts we're interested in
    const filteredAccounts = allAccounts.filter(account =>
        financial_provider_accounts.includes(account.accountNumber)
    );

    if (filteredAccounts.length === 0) {
        console.warn(`No accounts found with account numbers: ${financial_provider_accounts.join(', ')}. Available accounts: ${allAccounts.map(a => a.accountNumber).join(', ')}`);
    } else if (filteredAccounts.length < financial_provider_accounts.length) {
        const foundAccountNumbers = filteredAccounts.map(a => a.accountNumber);
        const missingAccountNumbers = financial_provider_accounts.filter(num => !foundAccountNumbers.includes(num));
        console.warn(`Some accounts not found. Missing: ${missingAccountNumbers.join(', ')}. Found: ${foundAccountNumbers.join(', ')}`);
    }

    return filteredAccounts;
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

            console.log(`Scraping accounts for ${account.financial_provider} (${account.username}): ${account.financial_provider_accounts.join(', ')}`);

            const scrapedAccounts = await scrapeAccounts(options, credentials, account.financial_provider_accounts);
            transactionsAccount.push(...scrapedAccounts);
        } catch (error) {
            console.error(`Failed to scrape account ${account.actual_account_id}: ${error instanceof Error ? error.message : String(error)}`);
            // Continue with other accounts instead of failing completely
        }
    }

    return transactionsAccount;
}
