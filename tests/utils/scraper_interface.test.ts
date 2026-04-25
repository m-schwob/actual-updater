import { test, expect, describe } from '@jest/globals';
import { getSupportedProviders, ProviderInfo } from '../../src/utils/scraper_interface';

describe('Scraper Interface Unit Tests', () => {
    describe('getSupportedProviders', () => {
        test('should return an array of provider info objects', () => {
            const providers = getSupportedProviders();

            expect(providers).toBeDefined();
            expect(Array.isArray(providers)).toBe(true);
            expect(providers.length).toBeGreaterThan(0);
        });

        test('should return providers with correct structure', () => {
            const providers = getSupportedProviders();

            providers.forEach((provider: ProviderInfo) => {
                expect(provider.id).toBeDefined();
                expect(typeof provider.id).toBe('string');
                expect(provider.name).toBeDefined();
                expect(typeof provider.name).toBe('string');
                expect(provider.loginFields).toBeDefined();
                expect(Array.isArray(provider.loginFields)).toBe(true);
            });
        });

        test('should include common Israeli banks and credit card providers', () => {
            const providers = getSupportedProviders();
            const providerIds = providers.map(p => p.id);

            // Check for common providers that should exist
            expect(providerIds).toContain('hapoalim');
            expect(providerIds).toContain('leumi');
            expect(providerIds).toContain('discount');
            expect(providerIds).toContain('visaCal');
            expect(providerIds).toContain('max');
        });

        test('should return correct name for hapoalim provider', () => {
            const providers = getSupportedProviders();
            const hapoalim = providers.find(p => p.id === 'hapoalim');

            expect(hapoalim).toBeDefined();
            expect(hapoalim!.name).toBe('Bank Hapoalim');
        });

        test('should return login fields including password for all providers', () => {
            const providers = getSupportedProviders();

            providers.forEach((provider: ProviderInfo) => {
                expect(provider.loginFields).toContain('password');
            });
        });
    });
});
