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

    // console.log(JSON.stringify(result));
    // let result = JSON.parse('[{ "txns": [], "accountNumber": "9412" }, { "txns": [{ "identifier": "25476209110", "type": "installments", "status": "completed", "date": "2024-03-28T01:34:09.000Z", "processedDate": "2024-04-01T21:00:00.000Z", "originalAmount": -94.31, "originalCurrency": "₪", "chargedAmount": -94.31, "chargedCurrency": "₪", "description": "סלקום שירות", "memo": "memo","installments":{"number":1,"total":3}, "category": "תקשורת ומחשבים" }, { "identifier": "25461488297", "type": "normal", "status": "completed", "date": "2024-03-26T10:49:27.000Z", "processedDate": "2024-04-01T21:00:00.000Z", "originalAmount": -265.5, "originalCurrency": "₪", "chargedAmount": -265.5, "chargedCurrency": "₪", "description": "מ. התחבורה - פנגו מוביט", "memo": "memo", "category": "מוסדות" }, { "identifier": "25454010633", "type": "installments", "status": "completed", "date": "2024-03-25T20:51:49.000Z", "processedDate": "2024-04-01T21:00:00.000Z", "originalAmount": -181, "originalCurrency": "₪", "chargedAmount": -181, "chargedCurrency": "₪", "description": "ויינר איטליאנו", "memo": "", "installments":{"number":1,"total":3}, "category": "מסעדות" }], "accountNumber": "2690" }, { "txns": [], "accountNumber": "5547" }]');
    await pushTransactions(result);
}

main();
