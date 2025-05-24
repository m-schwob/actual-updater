import { checkAndCreateFolder } from "../app-globals";

export async function initializeApi(password: string = 'password') {
    const api = require('@actual-app/api');

    async () => {
        checkAndCreateFolder('./budgets');
        await api.init({
            serverURL: 'http://localhost:5006',
            password: password,
            dataDir: './budgets'
        });
    }
    return api;
}

export function fetchUserBudgetFileIds(userId: string, api: any): Promise<string[]> {
    const userBudgetQuery = api
        .query('users')
        .filter({ "user_id": userId })
        .select('file_id');
    return api.runQuery(userBudgetQuery);
}

export async function fetchAllBudgets(api: any) {
    return await api.getBudgets();
}

export async function getUserBudgetNames(userId: string, password: string) {
    const api = await initializeApi(password);
    const allBudgets = await fetchAllBudgets(api);
    const userBudgetFileIds = await fetchUserBudgetFileIds(userId, api);
    const userBudgetNames = [];
    for (const budget of allBudgets) {
        if (userBudgetFileIds.some((ub: any) => ub.file_id === budget.id)) {
            userBudgetNames.push(budget);
        }
    }
    return userBudgetNames;
}

export function getBudgetAccounts(budget: any): Record<string, string> {
    const budgetAccounts: Record<string, string> = {};
    if (budget.accounts) {
        for (const account of budget.accounts) {
            budgetAccounts[account.name] = account.id;
        }
    }
    return budgetAccounts;
}

