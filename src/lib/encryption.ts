import crypto from 'crypto';

/**
 * Company-specific encryption service compatible with executor-server decryption
 * Uses PBKDF2 key derivation for multi-tenant security
 */
class EncryptionService {
  private masterKey: Buffer;
  private keyVersion: number;
  
  constructor() {
    // Skip initialization during build time
    if (typeof window !== 'undefined' || process.env.NODE_ENV === 'production') {
      const masterKeyHex = process.env.MASTER_ENCRYPTION_KEY;
      this.keyVersion = parseInt(process.env.KEY_VERSION || '1');
      
      if (!masterKeyHex) {
        throw new Error('MASTER_ENCRYPTION_KEY environment variable is required');
      }
      
      if (masterKeyHex.length !== 64) {
        throw new Error('MASTER_ENCRYPTION_KEY must be 64 hex characters (256 bits)');
      }
      
      try {
        this.masterKey = Buffer.from(masterKeyHex, 'hex');
      } catch (error) {
        throw new Error('MASTER_ENCRYPTION_KEY must be valid hexadecimal');
      }
    } else {
      // Build-time placeholder values
      this.masterKey = Buffer.alloc(32);
      this.keyVersion = 1;
    }
  }

  /**
   * Derive company-specific encryption key using PBKDF2
   * This ensures each company's data can only be decrypted with their specific key
   */
  private deriveCompanyKey(companyId: string): Buffer {
    const salt = `company:${companyId}:v${this.keyVersion}`;
    
    return crypto.pbkdf2Sync(
      this.masterKey,
      salt,
      100000, // iterations - high for security
      32,     // key length (256 bits)
      'sha512'
    );
  }

  /**
   * Encrypt secret value for a specific company
   * Output format: version:iv:authTag:encrypted (compatible with executor-server)
   */
  async encryptSecret(companyId: string, plaintext: string): Promise<string> {
    if (!companyId || !plaintext) {
      throw new Error('Company ID and plaintext are required');
    }

    try {
      const companyKey = this.deriveCompanyKey(companyId);
      const iv = crypto.randomBytes(16); // 128-bit IV for GCM
      
      const cipher = crypto.createCipher('aes-256-gcm', companyKey);
      
      // Additional Authenticated Data (AAD) for extra security
      const aad = Buffer.from(`company:${companyId}`);
      cipher.setAAD(aad);
      
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      // Format: version:iv:authTag:encrypted
      const result = [
        this.keyVersion.toString(),
        iv.toString('hex'),
        authTag.toString('hex'),
        encrypted
      ].join(':');
      
      return result;
      
    } catch (error) {
      console.error('Encryption failed:', { companyId, error: error instanceof Error ? error.message : error });
      throw new Error('Failed to encrypt secret');
    }
  }

  getCurrentKeyVersion(): number {
    return this.keyVersion;
  }

  isEncrypted(value: string): boolean {
    if (!value || typeof value !== 'string') {
      return false;
    }
    
    const parts = value.split(':');
    return parts.length === 4 && 
           !isNaN(parseInt(parts[0] || '')) && 
           /^[0-9a-f]{32}$/i.test(parts[1] || '') && 
           /^[0-9a-f]{32}$/i.test(parts[2] || '') && 
           /^[0-9a-f]+$/i.test(parts[3] || '');
  }
}

// Singleton instance
let encryptionInstance: EncryptionService | null = null;
export const getEncryptionService = (): EncryptionService => {
  if (!encryptionInstance) {
    encryptionInstance = new EncryptionService();
  }
  return encryptionInstance;
};

// Legacy functions for backward compatibility
export function encrypt(text: string): string {
  // Legacy encryption - keeping for backward compatibility
  const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
  if (!ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY environment variable is required');
  }
  
  const iv = crypto.randomBytes(12);
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(ENCRYPTION_KEY, salt, 32);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + salt.toString('hex') + ':' + encrypted;
}

export function decrypt(encryptedData: string): string {
  // Legacy decryption - keeping for backward compatibility
  const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
  if (!ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY environment variable is required');
  }
  
  const parts = encryptedData.split(':');
  if (parts.length !== 4) {
    throw new Error('Invalid encrypted data format');
  }
  
  const iv = Buffer.from(parts[0]!, 'hex');
  const authTag = Buffer.from(parts[1]!, 'hex');
  const salt = Buffer.from(parts[2]!, 'hex');
  const encrypted = parts[3]!;
  
  const key = crypto.scryptSync(ENCRYPTION_KEY, salt, 32);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
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