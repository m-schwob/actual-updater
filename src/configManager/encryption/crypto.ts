import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const IV_SIZE = 16;
const KEY_SIZE = 32;


export async function encrypt(text: string, key: crypto.CipherKey, iv: crypto.BinaryLike): Promise<string> {
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = cipher.update(text, 'utf8', 'hex');
  return encrypted + cipher.final('hex');
}

export async function decrypt(text: string, key: crypto.CipherKey, iv: crypto.BinaryLike): Promise<string> {
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  const decrypted = decipher.update(text, 'hex', 'utf8');
  return decrypted + decipher.final('utf8');
}

export function generateKey(characters: number = KEY_SIZE): Buffer {
  return crypto.randomBytes(characters);
}

export function generateIv(): Buffer {
  return crypto.randomBytes(IV_SIZE);
}

