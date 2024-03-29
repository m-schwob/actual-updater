import * as readline from 'readline/promises';
import { Config } from './commonTypes';
import { getConfig, updateConfig } from './configManager/configManager';
import { configFilePath } from './app-globals';
import { DEFAULT_CONFIG } from './configManager/defaultConfig';
import { getAllAccountsResults } from './scraper';
import { pushTransactions } from './importer';


async function main(): Promise<void> {
    const config = await getConfig();
    console.log(config);
    let result = await getAllAccountsResults(config);
    // console.log(result);
    
    let api = require('@actual-app/api');
    
    await api.init({
        // Budget data will be cached locally here, in subdirectories for each file.
        dataDir: 'temp',
        // This is the URL of your running server
        serverURL: 'http://localhost:5006',
        // This is the password you use to log into the server
        password: 'actualtest',
    });

    // async function run() {
    //     //   let acctId = await api.createAccount('test');
    //       let acctId = '8a7fc0f0-f768-4369-ab6a-fb0f18f6b2db';
    //       await api.addTransactions(
    //         acctId,
    //         [{account: acctId,
    //             date: new Date('2024-03-20')}]
    //       );
    //   }
      
    //   api.runImport('My-Finances-d9e5d0a', run);



    await api.downloadBudget('6a3ed3c3-f8d3-42be-b0cc-d310729c6df5');
    // await api.loadBudget('My-Finances-d9e5d0a');
    // await api.addTransactions(
    //         '8a7fc0f0-f768-4369-ab6a-fb0f18f6b2db',
    //         [{
    //             account:'8a7fc0f0-f768-4369-ab6a-fb0f18f6b2db',
    //             date: new Date('2024-03-15')}]
    //         ).then(console.error);
        
    await pushTransactions(result);
    await api.shutdown();
}

main();
