// import {importTransactions, runWithBudget, createAccount,convertAccount} from '@actual-app/api';
let api = require('@actual-app/api');
import { Transaction as scraperTransaction, TransactionsAccount as scraperTransactionsAccount } from 'israeli-bank-scrapers/lib/transactions';

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
        // TODO see if can do better assiment
        let actualTransaction: actualTransaction = {
            account: scrapedAccount.accountNumber,
            date: scraperTransaction.date.split('T')[0] //TODO check if need date conversion 
        };
        // for (const [aKey, bKey] of Object.entries(transactionKeyMapping)) {
        //     actualTransaction[aKey] = scraperTransaction[bKey];
        // }
        actualTranscations.push(actualTransaction);
    }
    return actualTranscations;
}



const accountMap: Record<string, string> = {
    "2690": "8a7fc0f0-f768-4369-ab6a-fb0f18f6b2db",
}

export async function pushTransactions(scrapedData: scraperTransactionsAccount[]) {
    // api.loadBudget('test-budget');
    // TODO handle a case where bank account not mapped to actual account
    for (let accountData of scrapedData) {
        //   let acctId = await api.createAccount(convertAccount(account));
        let accountId = accountMap[accountData.accountNumber];
        if (accountId == undefined) continue; // TODO consider log or notify the user
            await api.importTransactions(accountId, mapTransactions(accountData));
    }
}



