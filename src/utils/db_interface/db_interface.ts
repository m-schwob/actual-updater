/**
 * TypeScript interface for database operations via Python 
 * Provides access to the Python db_interface functionality from TypeScript
 */

import { execFile } from "child_process";
import { BudgetProvider } from '../types';


/**
 * General helper function to run a Python function with arguments
 * @param module - The Python module to import
 * @param func - The function to call
 * @param args - Arguments to pass to the function (Json serializable)
 * @param timeout - (Optional) Timeout in milliseconds for the Python process (default: 30000 ms)
 * @param maxBuffer - (Optional) Maximum buffer size for stdout/stderr in bytes (default: 10 MB)
 * @returns Promise resolving to the function's return value as a string
 * @throws Error if the Python function fails or returns an error
 */
function runPythonFunc(
    module: string,
    func: string,
    args: any,
    timeout: number = 30000,
    maxBuffer: number = 10 * 1024 * 1024
): Promise<any> {
    return new Promise((resolve, reject) => {
        const code = [
            'import json, sys',
            `from ${module} import ${func}`,
            `print(json.dumps(${func}(**json.loads(sys.argv[1]))))`
        ].join('\n');

        execFile("python3", ["-c", code, JSON.stringify(args)], { timeout, maxBuffer }, (err, stdout, stderr) => {
            if (err) {
                const errMsg = stdout ? stdout.trim() + '\n' : '' + stderr ? stderr.trim() : String(err).trim();
                return reject(new Error(errMsg));
            }
            try {
                resolve(JSON.parse(stdout.trim()));
            } catch (parseError) {
                reject(new Error(`Failed to parse Python output as JSON: ${stdout.trim()}\nError: ${parseError}`));
            }
        });
    });
}


/**
 * Load accounts from the database with decrypted passwords
 * 
 * @param budgetId - The budget ID to filter accounts by
 * @param actualAccountIds - List of Actual account IDs to load
 * @returns Promise resolving to array of account objects with passwords
 */
export async function loadAccounts(budgetId: string, actualAccountIds: string[]): Promise<BudgetProvider[]> {
    return await runPythonFunc(
        "src.utils.db_interface.db_interface",
        "load_accounts",
        { "budget_id": budgetId, "actual_account_ids": actualAccountIds }
    ) as BudgetProvider[];
}
