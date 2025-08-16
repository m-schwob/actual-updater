/**
 * Service entry point for Actual Updater
 * Main application startup and orchestration
 */

import { ActualUpdaterService } from './service';
import { loadConfig } from '../utils/config';

/**
 * Main application function
 */
async function main(): Promise<void> {
    console.log('Starting Actual Updater Service...');

    try {
        // Load configuration
        console.log('Loading configuration...');
        const config = loadConfig();

        const service = await ActualUpdaterService.create(config.actual, config.scrapingOptions);
        await service.start();
    } catch (error) {
        console.error('Service failed to start:', error);
        process.exit(1);
    }
}

/**
 * Handle uncaught errors gracefully
 */
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Start the application
if (require.main === module) {
    main().catch(error => {
        console.error('Failed to start service:', error);
        process.exit(1);
    });
}

export { main };
