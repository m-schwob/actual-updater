import { test, expect, describe } from '@jest/globals';
import { main } from '../../src/service/index';

describe('Service Index Integration Tests', () => {
    test('should run main function without error', async () => {
        console.log('Running main function...');
        process.env.CONFIG_PATH = 'tests/sources/utils/validConfig.yaml';
        // Run the main function - it should complete without throwing
        await expect(main()).resolves.toBeUndefined();

        console.log('Main function completed successfully');
    }, 60000); // 60 second timeout for full workflow
});
