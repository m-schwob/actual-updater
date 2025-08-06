import * as api from '@actual-app/api';

/**
 * Production OIDC Budget Automation Example
 * 
 * This script demonstrates a complete workflow for:
 * - OIDC authentication
 * - Budget discovery and download
 * - Account management
 * - Transaction creation
 */
async function productionOIDCExample() {
    console.log('=== Production OIDC Budget Automation ===\n');

    try {
        // Setup environment and initialize API
        await api.init({
            dataDir: './data/budgets',
            serverURL: 'http://127.0.0.1:5006'
        });

        // Authenticate with OIDC
        const oidcToken = 'b2d44190-b298-494a-89ce-d253c1c7d6a6';
        await api.internal.send('subscribe-set-token', { token: oidcToken });

        const user = await api.internal.send('subscribe-get-user');
        console.log(`Authenticated as: ${user.displayName}`);

        // Get all available budgets (local and remote)
        const budgets = await api.getBudgets();
        console.log(`\\nFound ${budgets.length} budget(s)`);

        // Filter for remote budgets only (have state field, no local id)
        const remoteBudgets = budgets.filter((budget: any) => budget.state);
        console.log(`Processing ${remoteBudgets.length} remote budget(s)`);

        // Process each remote budget
        for (const budget of remoteBudgets) {
            console.log(`\\n--- Processing Budget: "${budget.name}" ---`);

            // 1. Print the user name
            console.log(`User: ${user.displayName}`);

            // 2. Download the budget (handles both remote download and local loading)
            console.log('Downloading/loading budget...');
            await api.downloadBudget(budget.groupId);
            console.log('Budget downloaded and loaded');

            // 3. Print the accounts
            let accounts = await api.getAccounts();
            console.log(`Current accounts (${accounts.length}):`);
            accounts.forEach((account: any, index: number) => {
                console.log(`  ${index + 1}. ${account.name} (${account.type})`);
            });

            // 4. Create new account if less than 5 accounts
            if (accounts.length < 5) {
                console.log('\\nCreating new account...');
                const newAccount = await api.createAccount({
                    name: `Auto Account ${Date.now()}`,
                    type: 'checking'
                });
                console.log(`Created account: Auto Account ${Date.now()}`);

                // Get updated accounts list
                accounts = await api.getAccounts();
                console.log(`Updated accounts (${accounts.length}):`);
                accounts.forEach((account: any, index: number) => {
                    console.log(`  ${index + 1}. ${account.name} (${account.type})`);
                });
            }

            // 5. Add 5 random transactions to each account
            console.log('\\nAdding transactions to accounts...');
            for (const account of accounts) {
                const transactions = [];
                for (let i = 0; i < 5; i++) {
                    transactions.push({
                        account: account.id,
                        amount: Math.floor(Math.random() * 10000) - 5000, // Random amount between -50.00 and 50.00
                        payee: `Auto Payee ${i + 1}`,
                        notes: `Automated transaction ${i + 1}`,
                        date: new Date().toISOString().split('T')[0] // Today's date
                    });
                }

                await api.addTransactions(account.id, transactions);
                console.log(`Added 5 transactions to ${account.name}`);
            }

            // 6. Print final summary
            console.log('\\n--- Final Summary ---');
            const finalAccounts = await api.getAccounts();
            console.log(`Total accounts: ${finalAccounts.length}`);

            for (const account of finalAccounts) {
                // Get transactions for this account (last 30 days)
                const endDate = new Date().toISOString().split('T')[0];
                const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                const transactions = await api.getTransactions(account.id, startDate, endDate);
                console.log(`  ${account.name}: ${transactions.length} transactions`);
            }

            console.log(`Budget "${budget.name}" processing complete`);

            // Sync the budget to ensure all changes are saved
            await api.sync();

            // Wait a moment to ensure services are fully settled before next budget
            await new Promise(resolve => setTimeout(resolve, 5000));
        }

        if (remoteBudgets.length === 0) {
            console.log('No remote budgets found to process');
            return;
        }

        console.log('=== All remote budgets processed successfully ===');

    } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : String(error));
    } finally {
        await api.shutdown();
    }
}

// Run the production example
productionOIDCExample().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
