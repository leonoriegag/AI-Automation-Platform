import { describe, it, expect, vi, beforeAll } from 'vitest';
import { CredentialRepository } from '../../apps/api/src/repositories/credential.repository.js';
import { encrypt, decrypt, maskSecret, logger } from '@nexora/shared';

describe('Zero-Plaintext & Secrets Isolation Suite', () => {
  const orgId = 'org-sec-zero-001';
  const testMasterKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

  beforeAll(() => {
    process.env.ENCRYPTION_MASTER_KEY = testMasterKey;
  });

  describe('At-Rest AES-256-GCM Envelope Encryption', () => {
    it('produces valid 3-part GCM envelope (iv:tag:ciphertext) with unique IVs', () => {
      const rawSecret = 'sk-super-secret-api-token-1234567890';
      const enc1 = encrypt(rawSecret, testMasterKey);
      const enc2 = encrypt(rawSecret, testMasterKey);

      // Distinct ciphertexts due to fresh IVs
      expect(enc1).not.toBe(enc2);

      const parts1 = enc1.split(':');
      expect(parts1).toHaveLength(3);
      const [ivHex, tagHex, cipherHex] = parts1;

      // 12 bytes IV = 24 hex chars
      expect(ivHex).toHaveLength(24);
      // 16 bytes Auth Tag = 32 hex chars
      expect(tagHex).toHaveLength(32);
      expect(cipherHex.length).toBeGreaterThan(0);

      // Decryption accurately recovers original secret
      expect(decrypt(enc1, testMasterKey)).toBe(rawSecret);
      expect(decrypt(enc2, testMasterKey)).toBe(rawSecret);
    });

    it('repository stores only ciphertext in DB and never plaintext secret', async () => {
      let savedDbRecord: any = null;

      const mockPrisma = {
        credential: {
          findFirst: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockImplementation(({ data }) => {
            savedDbRecord = {
              id: 'cred-123',
              createdAt: new Date(),
              updatedAt: new Date(),
              ...data,
            };
            return Promise.resolve(savedDbRecord);
          }),
        },
      };

      const repo = new CredentialRepository(mockPrisma as any);
      const sensitivePassword = 'MySuperSecretDatabasePassword!@#123';

      const created = await repo.create(orgId, {
        name: 'Database Master Password',
        type: 'BASIC_AUTH',
        secret: sensitivePassword,
      });

      // Verify DB record does NOT contain the plaintext secret
      expect(savedDbRecord).toBeDefined();
      expect(savedDbRecord.encryptedSecret).not.toBe(sensitivePassword);
      expect(savedDbRecord.encryptedSecret).not.toContain(sensitivePassword);
      expect(savedDbRecord.encryptedSecret.split(':')).toHaveLength(3);

      // Verify returned metadata does NOT include secret or encryptedSecret
      expect((created as any).secret).toBeUndefined();
      expect((created as any).encryptedSecret).toBeUndefined();
      expect(created.maskedHint).toBe('MySu...#123');
    });
  });

  describe('API Masking & Sanitization', () => {
    it('masks secrets securely according to length', () => {
      expect(maskSecret('sk-proj-1234567890abcdef')).toBe('sk-p...cdef');
      expect(maskSecret('12345678')).toBe('****'); // short secret masked completely
      expect(maskSecret('')).toBe('***');
    });

    it('list and findById return masked hints only and never decrypt or reveal secrets', async () => {
      const dbCred = {
        id: 'cred-api-1',
        organizationId: orgId,
        name: 'OpenAI Production Key',
        type: 'API_KEY',
        encryptedSecret: encrypt('sk-real-openai-production-key-998877', testMasterKey),
        maskedHint: 'sk-r...8877',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockPrisma = {
        credential: {
          findMany: vi.fn().mockResolvedValue([dbCred]),
          findFirst: vi.fn().mockResolvedValue(dbCred),
        },
      };

      const repo = new CredentialRepository(mockPrisma as any);

      const list = await repo.list(orgId);
      expect(list).toHaveLength(1);
      expect((list[0] as any).encryptedSecret).toBeUndefined();
      expect((list[0] as any).secret).toBeUndefined();
      expect(list[0].maskedHint).toBe('sk-r...8877');

      const single = await repo.findById(orgId, 'cred-api-1');
      expect((single as any).encryptedSecret).toBeUndefined();
      expect((single as any).secret).toBeUndefined();
      expect(single.maskedHint).toBe('sk-r...8877');
    });
  });

  describe('Structured Logging Redaction & Audit Safety', () => {
    it('redacts sensitive headers, tokens, keys and credentials from log payloads', () => {
      const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

      const contextWithSecrets = {
        workflowId: 'wf-100',
        token: 'eyJh...super-secret-jwt-token',
        apiKey: 'sk-secret-stripe-key',
        authorization: 'Bearer sensitive-token',
        password: 'admin-password',
        nested: {
          secret: 'db-connection-string-secret',
          safeField: 'normal-value',
        },
        items: [
          { jwt: 'jwt-payload', id: 1 },
        ],
      };

      logger.info('Processing payment webhook', contextWithSecrets);

      expect(consoleSpy).toHaveBeenCalled();
      const loggedJson = JSON.parse(consoleSpy.mock.calls[0][0]);

      expect(loggedJson.token).toBe('[REDACTED]');
      expect(loggedJson.apiKey).toBe('[REDACTED]');
      expect(loggedJson.authorization).toBe('[REDACTED]');
      expect(loggedJson.password).toBe('[REDACTED]');
      expect(loggedJson.nested.secret).toBe('[REDACTED]');
      expect(loggedJson.nested.safeField).toBe('normal-value');
      expect(loggedJson.items[0].jwt).toBe('[REDACTED]');
      expect(loggedJson.items[0].id).toBe(1);

      consoleSpy.mockRestore();
    });
  });
});
