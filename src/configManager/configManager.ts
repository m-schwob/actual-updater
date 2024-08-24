import { existsSync, promises as fs } from 'fs';
import { decrypt, encrypt, extractIV, generateIv, prependIv, generateKey } from './encryption/crypto';
import { Config } from '../commonTypes';
import { configFilePath } from '../app-globals';
import { DEFAULT_CONFIG } from './defaultConfig';
import getKey from './encryption/keytar';

export async function getConfig(configPath: string = configFilePath): Promise<Config> {
  const fileContent = await getConfigFromFile(configPath);

  if (fileContent) {
    const [iv, encryptedConfig] = extractIV(fileContent);
    const key = await getKey();

    const decryptedConfig = await decrypt(encryptedConfig, key, iv) as string;
    return JSON.parse(decryptedConfig);
  }

  // Fallback to configExample if there is no config file defined at all. TODO review the default configuration.
  return DEFAULT_CONFIG;
}

export async function updateConfig(configPath: string, configToUpdate: Config): Promise<void> {
  const currentConfig = await getConfig(configPath);
  currentConfig.scraping.accountsToScrape = currentConfig.scraping.accountsToScrape.concat(configToUpdate.scraping.accountsToScrape)
  const stringifiedConfig = JSON.stringify(currentConfig, null, 2);

  const key = await getKey();
  const iv = generateIv();
  const encryptedConfig = await encrypt(stringifiedConfig, key, iv);
  const fileContent = prependIv(iv, encryptedConfig);
  await fs.writeFile(configPath, fileContent);
}

export async function getConfigFromFile(configPath: string) {
  if (existsSync(configPath)) {
    return fs.readFile(configPath, {
      encoding: 'utf8'
    });
  }
  return '';
}
