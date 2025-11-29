/**
 * Scraper interface utilities for israeli-bank-scrapers
 * Provides functions to get supported providers and scrape accounts
 */

import puppeteer from 'puppeteer';
import { promises as dns } from 'dns';
import {
    CompanyTypes,
    SCRAPERS,
    createScraper,
    ScraperCredentials,
    ScraperOptions,
    ScraperScrapingResult
} from 'israeli-bank-scrapers';
import { TransactionsAccount } from 'israeli-bank-scrapers/lib/transactions';

/**
 * Default number of days to look back when scraping accounts
 */
const DEFAULT_SCRAPE_LOOKBACK_DAYS = 30;

/**
 * Information about a supported financial provider
 */
export interface ProviderInfo {
    id: string;
    name: string;
    loginFields: string[];
}

/**
 * Credentials for scraping a provider
 */
export interface ProviderCredentials {
    provider: string;
    username: string;
    password: string;
}

/**
 * Account information returned from scraping
 */
export interface ScrapedAccount {
    accountNumber: string;
    balance?: number;
}

/**
 * Result of scraping provider accounts
 */
export interface ScrapeAccountsResult {
    success: boolean;
    accounts?: ScrapedAccount[];
    errorMessage?: string;
}

/**
 * Get list of all supported financial providers from israeli-bank-scrapers
 * @returns Array of provider information including id, name and required login fields
 */
export function getSupportedProviders(): ProviderInfo[] {
    const providers: ProviderInfo[] = [];

    for (const companyType of Object.values(CompanyTypes)) {
        const scraperInfo = SCRAPERS[companyType];
        if (scraperInfo) {
            providers.push({
                id: companyType,
                name: scraperInfo.name,
                loginFields: scraperInfo.loginFields
            });
        }
    }

    return providers;
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
        // IPv4 regex with proper octet validation (0-255)
        const ipv4Pattern = /^(?:(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)$/;
        const isIpv4 = ipv4Pattern.test(hostname);
        const isIpv6 = /^\[[0-9a-fA-F:]+\]$/.test(hostname) || /:[0-9a-fA-F:]+/.test(hostname);
        if (isIpv4 || isIpv6 || hostname === 'localhost') {
            return chromiumUrl;
        }

        // attempt DNS lookup (returns first address)
        const result = await dns.lookup(hostname);
        if (result && result.address) {
            chromiumUrlObject.hostname = result.address;
            return chromiumUrlObject.toString();
        }
    } catch {
        // If resolution fails, return original URL
    }
    return chromiumUrl;
}

/**
 * Scrape available accounts from a financial provider
 * @param credentials - Provider credentials including provider name, username and password
 * @returns Result object containing success status and list of scraped accounts
 */
export async function scrapeProviderAccounts(credentials: ProviderCredentials): Promise<ScrapeAccountsResult> {
    // Validate provider name against CompanyTypes enum
    const providerKey = credentials.provider as keyof typeof CompanyTypes;
    if (!CompanyTypes[providerKey]) {
        return {
            success: false,
            errorMessage: `Unsupported provider: ${credentials.provider}`
        };
    }

    const chromiumUrl = process.env.CHROMIUM_URL || 'http://chromium:9222';
    const resolvedChromiumUrl = await resolveChromiumUrlToIp(chromiumUrl);

    let scrapeResult: ScraperScrapingResult;
    try {
        const browser = await puppeteer.connect({
            browserURL: resolvedChromiumUrl
        });

        try {
            const browserContext = await browser.createBrowserContext();
            const options: ScraperOptions = {
                companyId: CompanyTypes[providerKey],
                startDate: new Date(Date.now() - DEFAULT_SCRAPE_LOOKBACK_DAYS * 24 * 60 * 60 * 1000),
                showBrowser: false,
                browserContext
            };

            const scraperCredentials: ScraperCredentials = {
                username: credentials.username,
                password: credentials.password
            };

            const scraper = createScraper(options);
            scrapeResult = await scraper.scrape(scraperCredentials);
        } finally {
            browser.disconnect();
        }

        if (scrapeResult.success && scrapeResult.accounts) {
            const accounts: ScrapedAccount[] = scrapeResult.accounts.map((account: TransactionsAccount) => {
                const result: ScrapedAccount = {
                    accountNumber: account.accountNumber
                };
                if (account.balance !== undefined) {
                    result.balance = account.balance;
                }
                return result;
            });

            return {
                success: true,
                accounts
            };
        } else {
            return {
                success: false,
                errorMessage: scrapeResult.errorMessage || 'Unknown error occurred during scraping'
            };
        }
    } catch (error) {
        return {
            success: false,
            errorMessage: error instanceof Error ? error.message : String(error)
        };
    }
}
