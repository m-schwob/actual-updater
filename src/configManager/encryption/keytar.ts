import * as keytar from 'keytar';
import { generateKey } from './crypto';

const SERVICE_NAME = 'actual-updater';
const ACCOUNT_NAME = 'encryption-key';

export async function saveKey(key: string, account: string = ACCOUNT_NAME): Promise<void> {
  return keytar.setPassword(SERVICE_NAME, account, key);
}

export async function loadKey(account: string = ACCOUNT_NAME): Promise<string | null> {
  return keytar.getPassword(SERVICE_NAME, account);
}

export default async function getKey(generateNew: boolean = true): Promise<Buffer> {
  const existedKey = await loadKey();
  if (existedKey) return Buffer.from(existedKey, 'hex');

  if (!generateNew) throw Error('Key does not exist');
  const newKey = generateKey();
  await saveKey(newKey.toString('hex'));
  return newKey;
}
