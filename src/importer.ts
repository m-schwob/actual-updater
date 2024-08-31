// import {importTransactions, runWithBudget, createAccount,convertAccount} from '@actual-app/api';
let api = require('@actual-app/api');
import { TransactionTypes, Transaction as scraperTransaction, TransactionsAccount as scraperTransactionsAccount } from 'israeli-bank-scrapers/lib/transactions';
import { accountMapFilePath } from './app-globals';
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
    await api.init({
        serverURL: 'https://actual.menashtech.com',
        password: 'actualtest',
    });

    const accountMap = await getAccounts();
    let budgets = await api.getBudgets();
    for (let budget of budgets) {
        if (budget.state == "remote") {
            await updateBudget(budget, scrapedData);
        }
    }   
}

async function updateBudget(budget: any, scrapedData: scraperTransactionsAccount[]) {
    await api.downloadBudget(budget.groupId);
    let accounts = await api.getAccounts();
    for (let accountData of scrapedData) {
        let budgetAccount = accounts.find((account: any) => account.name == accountData.accountNumber);
        await updateAccount(accountData, budgetAccount);
    }
    await api.shutdown();
}

async function updateAccount(accountData: scraperTransactionsAccount, budgetaccount: any) {
        let accountNumber = accountData.accountNumber;
        let accountId;
    if (budgetaccount) {
        accountId = budgetaccount.id;
    }
    else {
        accountId = await addAccountToBudget(accountNumber);
    }
    await api.importTransactions(accountId, mapTransactions(accountData));
}

async function addAccountToBudget(accountNumber: string) {
    let accountId = await api.createAccount({
                name: accountNumber,
        type: "savings",
        id: accountNumber
              });
    return accountId;
}
