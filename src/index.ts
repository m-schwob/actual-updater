import * as readline from 'readline/promises';
import { Config } from './commonTypes';
import { getConfig, updateConfig } from './configManager/configManager';
import { checkAndCreateFolder, configFilePath, userDataPath } from './app-globals';
import { DEFAULT_CONFIG } from './configManager/defaultConfig';
import { getAllAccountsResults } from './scraper';
import { pushTransactions } from './importer';


async function main(): Promise<void> {
    checkAndCreateFolder(userDataPath);
    const config = await getConfig();
    console.log(config);
    let result = await getAllAccountsResults(config);
    await pushTransactions(result);
}

main();
