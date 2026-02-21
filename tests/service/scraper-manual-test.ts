import promptSync from 'prompt-sync';
import { CompanyTypes, ScraperCredentials, ScraperOptions, SCRAPERS } from 'israeli-bank-scrapers';
import { scrapeBudgetProviders } from '../../src/service/scraper';
import { BudgetProvider, ScrapingOptions } from '../../src/utils/types';

const prompt = promptSync({ sigint: true });

async function promptForCredentials(providerName: CompanyTypes): Promise<ScraperCredentials> {
    const provider = SCRAPERS[providerName];
    console.log(`Please provide credentials for provider: ${provider.name}`);
    let credentials = {};
    for (const field of provider.loginFields) {
        if (field === 'password') {
            credentials[field] = prompt(`Enter ${field}: `, { echo: '' }); // hidden input
        } else {
            credentials[field] = prompt(`Enter ${field}: `);
        }
    }
    return credentials as ScraperCredentials;
}

async function main() {
    const testedProviders = [CompanyTypes.visaCal, CompanyTypes.beinleumi, CompanyTypes.max];

    const budgetProviders: BudgetProvider[] = [];

    for (const providerName of testedProviders) {
        const shouldTest = prompt(`Test ${SCRAPERS[providerName].name}? (y/n): `).toLowerCase().startsWith('y');
        if (!shouldTest) continue;

        const credentials: ScraperCredentials = await promptForCredentials(providerName);
        const financialProviderAccountId = await prompt(`Enter account ID: `);
        budgetProviders.push({
            budgetId: 'manual-test-budget',
            financialProvider: providerName,
            accountsMapping: [
                {
                    actualAccountId: `${providerName}-manual-test-account`,
                    financialProviderAccountId: financialProviderAccountId
                }
            ],
            financialProviderUsername: 'username' in credentials ? credentials.username : '',
            financialProviderPassword: credentials.password
        });

        const options: ScrapingOptions = { scrapeSince: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }; // Scrape last 7 days
        const result = await scrapeBudgetProviders(budgetProviders, options);

        console.log("\n--- Scraping Results ---");
        for (const res of result) {
            const providerName = budgetProviders.find(
                bp => bp.accountsMapping.find(acc => acc.actualAccountId === res.actualAccountId)
            )!.financialProvider;
            const scrapedTransactions = res.scrapedTransactions;
            console.log(`\nTransactions from ${providerName}-${scrapedTransactions.accountNumber}:`);
            console.table(scrapedTransactions.txns);
        }
    }
}

main().catch(console.error);