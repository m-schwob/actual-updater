/**
 * Configuration types and utilities for Actual Updater
 * Based on DESIGN.md configuration schema
 */

import { readFileSync } from 'fs';
import * as yaml from 'js-yaml';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

/**
 * OIDC configuration
 */
export interface OidcConfig {
    clientId: string;
    clientSecret: string;
    serverUrl: string;
}

/**
 * Actual Budget configuration
 */
export interface ActualConfig {
    actualServerUrl: string;
    apiDataDirectory: string;
    adminToken: string;
}

/**
 * Cron job configuration
 */
export interface CronJobConfig {
    schedule: string; // Cron schedule expression
}

/**
 * Main configuration structure
 */
export interface Config {
    oidc: OidcConfig;
    actual: ActualConfig;
    cronJob: CronJobConfig;
    dataDirectory: string;
}

/**
 * Raw YAML configuration structure (before processing)
 */
interface RawYamlConfig {
    oidc: OidcConfig;
    actual: {
        actualServerUrl: string;
        actualServerDb?: string; // For automatic admin token extraction
        adminToken?: string; // Alternative manual token
    };
    cronJob: CronJobConfig;
    dataDirectory?: string; // Optional in YAML
}

/**
 * Process admin token - extract from DB or use provided token
 */
function processAdminToken(rawConfig: RawYamlConfig): string {
    let adminToken = rawConfig.actual.adminToken;

    if (!adminToken && rawConfig.actual.actualServerDb) {
        const extractedToken = extractAdminTokenFromDb(rawConfig.actual.actualServerDb);
        if (!extractedToken) {
            throw new Error('Failed to extract admin token from actualServerDb');
        }
        adminToken = extractedToken;
    }

    return adminToken!; // Non-null assertion: guaranteed by validation
}

/**
 * Build final configuration from validated raw config
 */
function buildFinalConfig(rawConfig: RawYamlConfig, adminToken: string, budgetFilesDir: string): Config {
    return {
        oidc: rawConfig.oidc,
        actual: {
            actualServerUrl: rawConfig.actual.actualServerUrl,
            apiDataDirectory: budgetFilesDir,
            adminToken: adminToken
        },
        cronJob: rawConfig.cronJob,
        dataDirectory: rawConfig.dataDirectory!
    };
}

/**
 * Load and parse configuration from YAML file
 */
export function loadConfig(configPath: string = process.env.CONFIG_PATH || './config.yaml'): Config {
    try {
        const configFile = readFileSync(configPath, 'utf8');
        const rawConfig = yaml.load(configFile) as RawYamlConfig;

        // Set default dataDirectory if not provided and create 'budget-files' subdirectory
        if (!rawConfig.dataDirectory) {
            rawConfig.dataDirectory = '/data';
        }
        const budgetFilesDir = join(rawConfig.dataDirectory, 'budget-files');
        if (!existsSync(budgetFilesDir)) {
            mkdirSync(budgetFilesDir, { recursive: true });
        }

        // Validate raw configuration first
        validateRawConfig(rawConfig);

        // Process admin token - extract from DB if needed
        const adminToken = processAdminToken(rawConfig);

        // Build and return final config
        return buildFinalConfig(rawConfig, adminToken, budgetFilesDir);

    } catch (error) {
        if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
            throw new Error(`Configuration file not found: ${configPath}`);
        }
        throw new Error(`Failed to load configuration: ${error}`);
    }
}

/**
 * Validate raw configuration structure (before processing)
 */
function validateRawConfig(rawConfig: RawYamlConfig): void {
    const requiredFields = [
        'oidc.clientId',
        'oidc.clientSecret',
        'oidc.serverUrl',
        'actual.actualServerUrl',
        'cronJob.schedule'
    ];

    // Check if all required fields are present
    for (const field of requiredFields) {
        const value = getNestedValue(rawConfig, field);
        if (!value) {
            throw new Error(`Required configuration field missing: ${field}`);
        }
    }

    // Validate that exactly one of adminToken or actualServerDb is provided (XOR)
    if (Boolean(rawConfig.actual.adminToken) === Boolean(rawConfig.actual.actualServerDb)) {
        throw new Error('Specify either actual.adminToken or actual.actualServerDb (not both or neither).');
    }
}

/**
 * Get nested object value using dot notation
 */
function getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Extract admin token from Actual server database
 * TODO: Implement actual database extraction logic
 */
function extractAdminTokenFromDb(dbPath: string): string | null {
    // TODO: Implement logic to read admin token from Actual server database
    // This would involve reading the SQLite database at dbPath and extracting
    // the admin user's OIDC token
    console.warn('Admin token extraction from database not yet implemented');
    return null;
}