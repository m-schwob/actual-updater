import { test, expect, describe, afterEach } from '@jest/globals';
import { loadConfig } from '../../src/utils/config';
import { existsSync, rmSync } from 'fs';


describe('Integration Tests', () => {
  const originalConfigPath = process.env.CONFIG_PATH;

  // General function to test loadConfig and assert results
  const testLoadConfig = (configPath?: string) => {
    const config = loadConfig(configPath);

    expect(config).toBeDefined();
    expect(config.oidc.clientId).toBe('your-oidc-client-id');
    expect(config.oidc.clientSecret).toBe('your-oidc-client-secret');
    expect(config.oidc.serverUrl).toBe('http://127.0.0.1:9091');
    expect(config.actual.actualServerUrl).toBe('http://127.0.0.1:5006');
    expect(config.actual.adminToken).toBe('b2d44190-b298-494a-89ce-d253c1c7d6a6');
    expect(config.cronJob.schedule).toBe('0 8 * * *');
    expect(config.dataDirectory).toBe('./data/actual-updater');
    expect(config.actual.apiDataDirectory).toBe('data/actual-updater/budget-files');
  };

  afterEach(() => {
    // Restore original environment variable
    if (originalConfigPath !== undefined) {
      process.env.CONFIG_PATH = originalConfigPath;
    } else {
      delete process.env.CONFIG_PATH;
    }

    // Clean up created directories
    if (existsSync('./data/actual-updater/budget-files')) {
      rmSync('./data/actual-updater/budget-files', { recursive: true, force: true });
    }
  });

  test('should load config from default path', () => {
    testLoadConfig();
  });

  test('should load config from explicit path parameter', () => {
    testLoadConfig('tests/sources/utils/validConfig.yaml');
  });

  test('should load config from CONFIG_PATH environment variable', () => {
    process.env.CONFIG_PATH = 'tests/sources/utils/validConfig.yaml';
    testLoadConfig();
  });
});

describe('Unit Tests', () => {
  test('should throw error for invalid config file', () => {
    process.env.CONFIG_PATH = 'tests/sources/utils/missingScheduleConfig.yaml';
    expect(() => loadConfig()).toThrowError(`Required configuration field missing: cronJob.schedule`);
  });
});
