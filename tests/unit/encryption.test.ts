import { describe, it, expect, beforeAll } from 'vitest';
import {
  encrypt,
  decrypt,
  maskSecret,
  computeHmac,
  verifyHmac,
  generateKey,
  DecryptionError
} from '@nexora/shared';

describe('AES-256-GCM Encryption Service', () => {
  const testKey = generateKey();

  beforeAll(() => {
    process.env.ENCRYPTION_MASTER_KEY = testKey;
  });

  it('should encrypt and decrypt plaintext successfully', () => {
    const secret = 'sk-live-super-secret-token-12345';
    const ciphertext = encrypt(secret);

    expect(ciphertext).toBeDefined();
    expect(ciphertext).not.toBe(secret);
    expect(ciphertext.split(':')).toHaveLength(3); // iv:authTag:ciphertext

    const decrypted = decrypt(ciphertext);
    expect(decrypted).toBe(secret);
  });

  it('should generate a unique IV on each encryption call', () => {
    const secret = 'identical-secret';
    const cipher1 = encrypt(secret);
    const cipher2 = encrypt(secret);

    expect(cipher1).not.toBe(cipher2);
    const iv1 = cipher1.split(':')[0];
    const iv2 = cipher2.split(':')[0];
    expect(iv1).not.toBe(iv2);

    expect(decrypt(cipher1)).toBe(secret);
    expect(decrypt(cipher2)).toBe(secret);
  });

  it('should fail with DecryptionError if ciphertext is tampered with', () => {
    const secret = 'untampered-data';
    const encrypted = encrypt(secret);
    const parts = encrypted.split(':');

    // Tamper with the last character of the ciphertext
    const tamperedCiphertext = parts[2].slice(0, -2) + (parts[2].endsWith('a') ? 'b' : 'a');
    const tampered = `${parts[0]}:${parts[1]}:${tamperedCiphertext}`;

    expect(() => decrypt(tampered)).toThrow(DecryptionError);
  });

  it('should fail with DecryptionError if authentication tag is tampered with', () => {
    const secret = 'untampered-data';
    const encrypted = encrypt(secret);
    const parts = encrypted.split(':');

    // Tamper with authentication tag
    const tamperedTag = '00' + parts[1].slice(2);
    const tampered = `${parts[0]}:${tamperedTag}:${parts[2]}`;

    expect(() => decrypt(tampered)).toThrow(DecryptionError);
  });

  it('should fail if decrypted with a different key', () => {
    const secret = 'secret-under-key-1';
    const encrypted = encrypt(secret, testKey);
    const anotherKey = generateKey();

    expect(() => decrypt(encrypted, anotherKey)).toThrow(DecryptionError);
  });

  it('should mask secret strings safely without exposing value', () => {
    expect(maskSecret('sk-live-9876543210abcdef')).toBe('sk-l...cdef');
    expect(maskSecret('short')).toBe('****');
    expect(maskSecret('')).toBe('***');
  });

  it('should compute and verify HMAC-SHA256 signatures with constant-time equality', () => {
    const payload = JSON.stringify({ event: 'lead.created', id: '123' });
    const secret = 'webhook-signing-secret';

    const sig = computeHmac(payload, secret);
    expect(sig).toHaveLength(64);

    expect(verifyHmac(payload, sig, secret)).toBe(true);
    const tamperedSig = sig.slice(0, -1) + (sig.endsWith('0') ? '1' : '0');
    expect(verifyHmac(payload, tamperedSig, secret)).toBe(false);
    expect(verifyHmac(payload, 'invalid-hex-length', secret)).toBe(false);
    expect(verifyHmac(payload, sig, 'wrong-secret')).toBe(false);
  });
});
