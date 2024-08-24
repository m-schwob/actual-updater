import { existsSync, promises as fs } from 'fs';
import { decrypt, encrypt } from './encryption/crypto';
import { Config } from '../commonTypes';
import { configFilePath } from '../app-globals';
import {DEFAULT_CONFIG} from './defaultConfig';

export async function getConfig(configPath: string = configFilePath): Promise<Config> {
  const configFromFile = await getConfigFromFile(configPath);

  if (configFromFile) {
    const decrypted = await decrypt(configFromFile) as string;
    return JSON.parse(decrypted);
  }

  // Fallback to configExample if there is no config file defined at all
  return DEFAULT_CONFIG;
}

export async function updateConfig(configPath: string, configToUpdate: Config): Promise<void> {
  const currentConfig = await getConfig(configPath);
  currentConfig.scraping.accountsToScrape = currentConfig.scraping.accountsToScrape.concat(configToUpdate.scraping.accountsToScrape)
  const stringifiedConfig = JSON.stringify(currentConfig, null, 2);
  const encryptedConfigStr = await encrypt(stringifiedConfig);
  await fs.writeFile(configPath, encryptedConfigStr);
}

export async function getConfigFromFile(configPath: string) {
  if (existsSync(configPath)) {
    return fs.readFile(configPath, {
      encoding: 'utf8'
    });
  }
  return '';
}

