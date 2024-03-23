import * as readline from 'readline/promises';
import { Config } from './commonTypes';
import { getConfig, updateConfig } from './configManager/configManager';
import { configFilePath } from './app-globals';
import  {DEFAULT_CONFIG}  from './configManager/defaultConfig';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});


let config: Config = DEFAULT_CONFIG;
updateConfig(configFilePath, config);

async function main(): Promise<void> {
    const foo = await getConfig();
    console.log(foo)
}

main()

console.log('menash');