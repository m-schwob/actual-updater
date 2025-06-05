// import {importTransactions, runWithBudget, createAccount,convertAccount} from '@actual-app/api';
let api = require('@actual-app/api');
import { TransactionTypes, Transaction as scraperTransaction, TransactionsAccount as scraperTransactionsAccount } from 'israeli-bank-scrapers/lib/transactions';
import { accountMapFilePath ,checkAndCreateFolder} from './app-globals';
import { getConfigFromFile } from './configManager/configManager';
import { existsSync, promises as fs } from 'fs';



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

const transactionKeyMapping: Mapper<actualTransaction, scraperTransaction> = {
    'account': 'identifier',
    'date': 'date',
    'amount': 'chargedAmount',
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
        let actualTransaction: actualTransaction = {
            account: scrapedAccount.accountNumber,
            date: scraperTransaction.date.split('T')[0], // TODO check if need date conversion 
            amount: api.utils.amountToInteger(scraperTransaction.chargedAmount),
            payee_name: scraperTransaction.description, // TODO consider mapping
            imported_payee: scraperTransaction.description,
            notes: notes.join(', '),
            imported_id: scraperTransaction.identifier?.toString(),
            cleared: false
        };
        actualTranscations.push(actualTransaction);
    }
    return actualTranscations;
}


export async function pushTransactions(scrapedData: scraperTransactionsAccount[]) {
    checkAndCreateFolder('./budgets');
    await api.init({
        serverURL: 'http://localhost:5006',
        password: 'password',
        dataDir: './budgets'

    });
    const accountMap = await getAccounts();
    let budgets = await api.getBudgets();
    for (let budget of budgets) {
        if (budget.state == "remote") {
            await updateBudget(budget, accountMap, scrapedData);
        }
    }   
}

async function updateBudget(budget: any, accountMap: any, scrapedData: scraperTransactionsAccount[]) {
    await api.downloadBudget(budget.groupId);
    if (!(budget.name in accountMap)){
        accountMap[budget.name] = {};
        await saveAccountMap(accountMap);
    }
    let budgetaccounts = accountMap[budget.name];
    for (let accountData of scrapedData) {
        await updateAccount(accountData, budgetaccounts, accountMap);
    }
    await api.shutdown();
}

async function updateAccount(accountData: scraperTransactionsAccount, budgetaccounts: any, accountMap: any) {
    let accountNumber = accountData.accountNumber;
    let accountId;
    if (accountNumber in budgetaccounts) {
        accountId = budgetaccounts[accountNumber];
    }
    else {
        accountId = await addAccountToBudget(accountId, accountNumber, budgetaccounts, accountMap);
    }
    await api.importTransactions(accountId, mapTransactions(accountData));
}

async function addAccountToBudget(accountId: any, accountNumber: string, budgetaccounts: any, accountMap: any) {
    accountId = await api.createAccount({
        name: accountNumber,
        type: "savings"
    });
    budgetaccounts[accountNumber] = accountId;
    await saveAccountMap(accountMap);
    return accountId;
}

async function saveAccountMap(accountMap: any) {
    const stringAccountMap = JSON.stringify(accountMap, null, 2);
    await fs.writeFile(accountMapFilePath, stringAccountMap);
}

async function getAccounts() {
    const accountMap = await getConfigFromFile(accountMapFilePath);
    return accountMap;
}
