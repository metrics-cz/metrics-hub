import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
if (!ENCRYPTION_KEY) {
  throw new Error('ENCRYPTION_KEY environment variable is required');
}
// TypeScript assertion - we've already checked it exists above
const encryptionKey: string = ENCRYPTION_KEY;

const ALGORITHM = 'aes-256-gcm';

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(12);
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(encryptionKey, salt, 32);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + salt.toString('hex') + ':' + encrypted;
}

export function decrypt(encryptedData: string): string {
  const parts = encryptedData.split(':');
  if (parts.length !== 4) {
    throw new Error('Invalid encrypted data format');
  }
  
  const iv = Buffer.from(parts[0]!, 'hex');
  const authTag = Buffer.from(parts[1]!, 'hex');
  const salt = Buffer.from(parts[2]!, 'hex');
  const encrypted = parts[3]!;
  
  const key = crypto.scryptSync(encryptionKey, salt, 32);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

export function encryptOAuthTokens(tokens: {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  scope?: string;
}): string {
  return encrypt(JSON.stringify(tokens));
}

export function decryptOAuthTokens(encryptedData: string): {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  scope?: string;
} {
  const decryptedString = decrypt(encryptedData);
  return JSON.parse(decryptedString);
}