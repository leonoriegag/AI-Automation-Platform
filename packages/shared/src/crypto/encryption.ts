import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // Standard 96-bit IV for AES-GCM
const AUTH_TAG_LENGTH = 16; // Standard 128-bit authentication tag

export class DecryptionError extends Error {
  constructor(message: string = 'Decryption failed: data corrupted or key invalid') {
    super(message);
    this.name = 'DecryptionError';
  }
}

/**
 * Returns the 32-byte encryption key buffer from hex or environment
 */
export function getMasterKey(keyHex?: string): Buffer {
  const hex = keyHex || process.env.ENCRYPTION_MASTER_KEY;
  if (!hex) {
    throw new Error('ENCRYPTION_MASTER_KEY is not defined in environment');
  }
  if (hex.length !== 64) {
    throw new Error('ENCRYPTION_MASTER_KEY must be a 64-character hex string (32 bytes)');
  }
  return Buffer.from(hex, 'hex');
}

/**
 * Generates a random 32-byte hex encryption key
 */
export function generateKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Encrypts plaintext using AES-256-GCM
 * Output format: <iv_hex>:<authTag_hex>:<ciphertext_hex>
 */
export function encrypt(plaintext: string, keyHex?: string): string {
  const key = getMasterKey(keyHex);
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH
  });

  let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
  ciphertext += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${ciphertext}`;
}

/**
 * Decrypts ciphertext using AES-256-GCM
 * Verifies authenticity tag; throws DecryptionError on tampering or wrong key
 */
export function decrypt(encryptedData: string, keyHex?: string): string {
  const parts = encryptedData.split(':');
  if (parts.length !== 3) {
    throw new DecryptionError('Invalid ciphertext structure');
  }

  const [ivHex, authTagHex, ciphertextHex] = parts;
  const key = getMasterKey(keyHex);
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  try {
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH
    });
    decipher.setAuthTag(authTag);

    let plaintext = decipher.update(ciphertextHex, 'hex', 'utf8');
    plaintext += decipher.final('utf8');
    return plaintext;
  } catch (err) {
    throw new DecryptionError();
  }
}

/**
 * Masks a secret string for safe display (e.g. sk-proj-12345678 -> sk-pr...5678)
 */
export function maskSecret(secret: string): string {
  if (!secret) return '***';
  if (secret.length <= 8) return '****';
  const prefix = secret.slice(0, 4);
  const suffix = secret.slice(-4);
  return `${prefix}...${suffix}`;
}

/**
 * Computes an HMAC-SHA256 signature
 */
export function computeHmac(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Verifies an HMAC-SHA256 signature using timingSafeEqual to avoid timing attacks
 */
export function verifyHmac(payload: string, signature: string, secret: string): boolean {
  try {
    if (!signature || signature.length !== 64 || !/^[0-9a-fA-F]{64}$/.test(signature)) {
      return false;
    }

    const expected = computeHmac(payload, secret);
    const expectedBuf = Buffer.from(expected, 'hex');
    const signatureBuf = Buffer.from(signature, 'hex');

    if (expectedBuf.length !== signatureBuf.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuf, signatureBuf);
  } catch {
    return false;
  }
}
