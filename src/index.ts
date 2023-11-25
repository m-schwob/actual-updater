import * as readline from 'readline/promises';
import configExample from './configManager/defaultConfig';
import { Config } from './commonTypes';
import { getConfig, updateConfig } from './configManager/configManager';
import { configFilePath } from './app-globals';
 
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

let config : Config = configExample;
updateConfig(configFilePath, config);

async function main(): Promise<void> {
    const foo = await getConfig();
    console.log(foo)
}

main()