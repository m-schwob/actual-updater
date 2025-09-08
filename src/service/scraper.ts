import puppeteer from 'puppeteer';
import { promises as dns } from 'dns';
import { CompanyTypes, createScraper, ScraperCredentials, ScraperOptions, ScraperScrapingResult } from 'israeli-bank-scrapers';
import { TransactionsAccount } from 'israeli-bank-scrapers/lib/transactions';
import { BudgetProvider, AccountsLink, TransactionsAccountLink, ScrapingOptions } from '../utils/types';



async function scrapeFinancialProvider(options: ScraperOptions, credentials: ScraperCredentials): Promise<TransactionsAccount[]> {
    const chromiumUrl = process.env.CHROMIUM_URL || 'http://chromium:9222';
    const resolvedChromiumUrl = await resolveChromiumUrlToIp(chromiumUrl);
    console.log("Connecting to existing browser instance...");
    
    // TODO consider connecting one time for all scraping. browser context can be use to insolate eac scraping
    const browser = await puppeteer.connect({
        browserURL: resolvedChromiumUrl
    });

    let scrapeResult: ScraperScrapingResult;
    try {
        const browserContext = await browser.createBrowserContext();
        options = {
            ...options,
            browserContext // scraper will do context close but not browser close
        };
        const scraper = createScraper(options);
        console.log("Starting scrape...");
        scrapeResult = await scraper.scrape(credentials);
    }
    finally {
        browser.disconnect();
    }

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

/**
 * Resolve a chromium URL's hostname to an IP address when appropriate.
 * Reasons: Chromium's remote-debugging HTTP server rejects Host headers that are not
 * an IP or localhost; resolving the service name to the container IP avoids a 500.
 * If the hostname is already an IP or `localhost`, or resolution fails, returns the original URL.
 */
async function resolveChromiumUrlToIp(chromiumUrl: string): Promise<string> {
    try {
        const chromiumUrlObject = new URL(chromiumUrl);
        const hostname = chromiumUrlObject.hostname;

        // if it's already an IP (v4/v6) or localhost, nothing to do
        const isIpv4 = /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname);
        const isIpv6 = /^\[[0-9a-fA-F:]+\]$/.test(hostname) || /:[0-9a-fA-F:]+/.test(hostname);
        if (isIpv4 || isIpv6 || hostname === 'localhost') {
            console.log("Chromium URL:", chromiumUrl);
            return chromiumUrl;
        }

        // attempt DNS lookup (returns first address)
        const result = await dns.lookup(hostname);
        if (result && result.address) {
            chromiumUrlObject.hostname = result.address;
            const resolvedChromiumUrl = chromiumUrlObject.toString();
            console.log("Resolved chromium URL:", resolvedChromiumUrl, "Resolved from:", chromiumUrl);
            return resolvedChromiumUrl
        }
    } catch (err) {
        console.warn('Could not resolve chromium host to IP, using original URL:', chromiumUrl, err);
    }
    return chromiumUrl;
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
                showBrowser: false,
            };

            const credentials: ScraperCredentials = {
                username: provider.financialProviderUsername,
                password: provider.financialProviderPassword || '',
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
