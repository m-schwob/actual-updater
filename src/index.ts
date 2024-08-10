import * as readline from 'readline/promises';
import { Config } from './commonTypes';
import { getConfig, updateConfig } from './configManager/configManager';
import { configFilePath } from './app-globals';
import  {DEFAULT_CONFIG}  from './configManager/defaultConfig';
import {getAllAccountsResults} from './scraper'


async function main(): Promise<void> {
    const config = await getConfig();
    console.log(config);
    let result = await getAllAccountsResults(config);
    console.log(result);
}

main();
