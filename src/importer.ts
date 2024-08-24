// import {importTransactions, runWithBudget, createAccount,convertAccount} from '@actual-app/api';
let api = require('@actual-app/api');
import { TransactionTypes, Transaction as scraperTransaction, TransactionsAccount as scraperTransactionsAccount } from 'israeli-bank-scrapers/lib/transactions';
import { accountMapFilePath } from './app-globals';
import { getConfigFromFile } from './configManager/configManager';
import { existsSync, promises as fs } from 'fs';



// TODO: seems that actual-app/api does not expoprt type for Transaction so I drecleard it here. verifiy it.
type actualTransaction = {
    id?: string;
    account: string;
    date: string;
    amount?: number;
    payee?: string;
    payee_name?: string;
    imported_payee?: string;
    category?: string;
    notes?: string;
    imported_id?: string;
    transfer_id?: string;
    cleared?: boolean;
    subtransactions?: actualTransaction;
};

type Mapper<T1, T2> = {
    [key in keyof T1]: keyof T2;
}

// TODO verify mapping
const transactionKeyMapping: Mapper<actualTransaction, scraperTransaction> = {
    // id:
    'account': 'identifier',
    'date': 'date',
    'amount': 'chargedAmount',
    // payee:,
    // payee_name:,
    'imported_payee': 'processedDate',
    'category': 'category',
    'notes': 'memo',
    'imported_id': 'identifier',
    // transfer_id:,
    // cleared:,
    // subtransactions:,

}

function mapTransactions(scrapedAccount: scraperTransactionsAccount): actualTransaction[] {
    let actualTranscations: actualTransaction[] = []
    for (let scraperTransaction of scrapedAccount.txns) {

        let notes = [];

        if (scraperTransaction.type === TransactionTypes.Installments && scraperTransaction.installments) {
            notes.push(`${scraperTransaction.installments.number}/${scraperTransaction.installments.total}`);
        }

        if(scraperTransaction.memo){
            notes.push(scraperTransaction.memo)
        }

        // if(scraperTransaction.chargedCurrency != '₪') TODO notify the user
        
        // TODO see if can do better assignment
        let actualTransaction: actualTransaction = {
            // id:,
            account: scrapedAccount.accountNumber,
            date: scraperTransaction.date.split('T')[0], // TODO check if need date conversion 
            amount: api.utils.amountToInteger(scraperTransaction.chargedAmount),
            // payee:,
            payee_name: scraperTransaction.description, // TODO consider mapping
            imported_payee: scraperTransaction.description,
            // category: scraperTransaction.category, // TODO consider mapping category
            notes: notes.join(', '),
            imported_id: scraperTransaction.identifier?.toString(),
            // transfer_id:,
            cleared: false
            // subtransactions:,
        };
        // for (const [aKey, bKey] of Object.entries(transactionKeyMapping)) {
        //     actualTransaction[aKey] = scraperTransaction[bKey];
        // }
        actualTranscations.push(actualTransaction);
    }
    return actualTranscations;
}


export async function pushTransactions(scrapedData: scraperTransactionsAccount[]) {
    await api.init({
        // Budget data will be cached locally here, in subdirectories for each file.
        dataDir: 'temp',
        // This is the URL of your running server
        serverURL: 'http://localhost:5006',
        // This is the password you use to log into the server
        password: 'actualtest',
    });

    // download and load budget
    //settings -> syncid
    await api.downloadBudget('a966a0e2-a915-4759-b55b-d3623b1d8ddb');
    const accountMapStr = await getConfigFromFile(accountMapFilePath);
    const accountMap = JSON.parse(accountMapStr);

    // TODO handle a case where bank account not mapped to actual account
    for (let accountData of scrapedData) {
        let accountNumber = accountData.accountNumber;
        let accountId;
        if(accountNumber in accountMap){
        //   let acctId = await api.createAccount(convertAccount(account));
            accountId = accountMap[accountNumber];
        }
        else{
            accountId = await api.createAccount({
                name: accountNumber,
                type: "savings"
              });
            accountMap[accountNumber] = accountId;
            const stringAccountMap = JSON.stringify(accountMap, null, 2);
            await fs.writeFile(accountMapFilePath, stringAccountMap);
        }

        await api.importTransactions(accountId, mapTransactions(accountData));
    }
    await api.shutdown();

}