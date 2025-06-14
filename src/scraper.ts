import { CompanyTypes, createScraper, ScraperCredentials, ScraperOptions } from 'israeli-bank-scrapers';
import { Config, AccountToScrapeConfig } from './commonTypes';
import { TransactionsAccount } from 'israeli-bank-scrapers/lib/transactions';

async function getAccountResults(options: ScraperOptions, credentials: ScraperCredentials): Promise<TransactionsAccount[] | undefined> {
    const scraper = createScraper(options);
    const scrapeResult = await scraper.scrape(credentials);
    if (scrapeResult.success && scrapeResult.accounts != undefined) {
        scrapeResult.accounts.forEach((account) => {
            console.log(`found ${account.txns.length} transactions for account number ${account.accountNumber}`);
        });
        return scrapeResult.accounts;
    }
    else {
        throw new Error(scrapeResult.errorType);
    }
}


export async function getAllAccountsResults(config: Config): Promise<TransactionsAccount[]> {
    let transactionsAccount: TransactionsAccount[] = [];
    config.scraping.accountsToScrape.forEach((async account => {
        let accounts: TransactionsAccount[] | undefined = await getAccountResults(account.options, account.loginFields)
        if (accounts != undefined) {
            transactionsAccount.concat(accounts)
        }
    }
    ));
    return transactionsAccount;
}

