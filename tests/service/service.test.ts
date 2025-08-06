import { test, expect, describe } from '@jest/globals';
import { ActualUpdaterService } from '../../src/service/service';
import { loadConfig } from '../../src/utils/config';


describe('ActualUpdaterService Integration Tests', () => {
    test('should create service and run import workflow', async () => {
        // Load configuration
        const config = loadConfig();
        expect(config).toBeDefined();
        expect(config.actual).toBeDefined();

        // Create and run the service
        console.log('Creating ActualUpdaterService...');
        const service = await ActualUpdaterService.create(config.actual);
        expect(service).toBeDefined();

        console.log('Starting service workflow...');
        await service.start();

        console.log('Service integration test completed successfully');
    }, 60000); // 60 second timeout for full workflow
});

describe('ActualUpdaterService Unit Tests', () => {
    // TODO: Add unit tests for individual ActualUpdaterService methods
    // e.g., testing error handling, edge cases, service initialization, etc.
});
