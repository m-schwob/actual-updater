/**
 * TypeScript interface for database operations via Python CLI
 * Provides access to the Python db_interface functionality from TypeScript
 */

import { spawn } from 'child_process';
import { join } from 'path';
import { Account } from '../types';

/**
 * Error structure returned from CLI operations
 */
export interface CLIError {
    error: string;
    type: string;
}

/**
 * Load accounts from the database with decrypted passwords
 * 
 * @param budgetId - The budget ID to filter accounts by
 * @param actualAccountIds - List of Actual account IDs to load
 * @returns Promise resolving to array of account objects with passwords
 */
export async function loadAccounts(budgetId: string, actualAccountIds: string[]): Promise<Account[]> {
    return new Promise((resolve, reject) => {
        // Path to the CLI script relative to the service folder
        const scriptPath = join(__dirname, '..', 'utils', 'db_cli.py');

        const args = [
            scriptPath,
            'load_accounts',
            '--budget-id', budgetId,
            '--actual-account-ids', ...actualAccountIds
        ];

        console.log(`Loading accounts for budget: ${budgetId}, accounts: ${actualAccountIds.join(', ')}`);

        const process = spawn('python3', args);

        let stdout = '';
        let stderr = '';

        process.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        process.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        process.on('close', (code) => {
            if (code === 0) {
                try {
                    const accounts = JSON.parse(stdout) as Account[];
                    console.log(`Successfully loaded ${accounts.length} accounts`);
                    resolve(accounts);
                } catch (parseError) {
                    const error = new Error(`Failed to parse JSON response: ${parseError}`);
                    console.error('JSON parse error:', error.message);
                    reject(error);
                }
            } else {
                try {
                    const errorData = JSON.parse(stderr) as CLIError;
                    const error = new Error(`${errorData.type}: ${errorData.error}`);
                    console.error('CLI error:', error.message);
                    reject(error);
                } catch (parseError) {
                    const error = new Error(`CLI failed with code ${code}: ${stderr || 'Unknown error'}`);
                    console.error('CLI execution error:', error.message);
                    reject(error);
                }
            }
        });

        process.on('error', (error) => {
            console.error('Process spawn error:', error.message);
            reject(new Error(`Failed to spawn Python process: ${error.message}`));
        });
    });
}
