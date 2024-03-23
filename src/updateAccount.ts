import * as readline from 'readline';
import { CompanyTypes } from 'israeli-bank-scrapers';

import { configFilePath } from './app-globals';
import { Config, AccountToScrapeConfig } from './commonTypes';
import { updateConfig } from './configManager/configManager';
import { DEFAULT_CONFIG } from './configManager/defaultConfig';

let rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question('Please enter your service provider: ', (serviceProvider) => {
    if (Object.values<string>(CompanyTypes).includes(serviceProvider))
        rl.question('Please enter your username: ', (username) => {
            rl.question('Please enter your password: ', (password) => {
                console.log(`Username: ${username}`);
                console.log(`Service Provider: ${serviceProvider}`);
                console.log(`Password: ${password}`);

                const CompanyType = CompanyTypes[serviceProvider as keyof typeof CompanyTypes];
                let accontConfig: AccountToScrapeConfig = {
                    companyID: CompanyType, loginFields: { username: username, password: password }
                }
                let config: Config = DEFAULT_CONFIG;
                config.scraping.accountsToScrape.push(accontConfig)
                updateConfig(configFilePath, config);
                rl.close();
            });
        });
    else {
        console.log('wrong service provider. valid service provider are:');
        for (var service of Object.values<string>(CompanyTypes))
            console.log(service);
    }
});

