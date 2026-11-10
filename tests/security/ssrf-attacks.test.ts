import { describe, it, expect, vi } from 'vitest';
import { validateSafeUrl, httpConnector } from '../../packages/connectors/src/index.js';
import { SSRFError } from '@nexora/shared';

describe('SSRF Attack Defense Suite', () => {
  describe('Loopback and Localhost Vector Rejection', () => {
    it.each([
      'http://localhost',
      'http://localhost:8080/admin',
      'https://LOCALHOST/secret',
      'http://127.0.0.1',
      'http://127.0.0.1:8000',
      'http://127.0.1.1',
      'http://127.255.255.255',
      'http://0.0.0.0',
      'http://[::1]',
      'http://[::1]:8080/metrics',
      'http://[::]',
      'http://[::ffff:127.0.0.1]',
      'http://2130706433', // Decimal notation for 127.0.0.1
      'http://0x7f000001', // Hex notation for 127.0.0.1
    ])('blocks loopback attempt: %s', (url) => {
      expect(() => validateSafeUrl(url)).toThrow(SSRFError);
    });
  });

  describe('RFC 1918 Private Network Subnet Rejection', () => {
    it.each([
      'http://10.0.0.1/status',
      'http://10.254.0.1:8080/api',
      'http://172.16.0.1/admin',
      'http://172.20.10.5:3000',
      'http://172.31.255.254',
      'http://192.168.0.1',
      'http://192.168.1.254:9000/internal',
      'http://[::ffff:10.0.0.1]',
      'http://[::ffff:172.16.0.1]',
      'http://[::ffff:192.168.1.1]',
    ])('blocks private network IP: %s', (url) => {
      expect(() => validateSafeUrl(url)).toThrow(SSRFError);
    });
  });

  describe('Cloud Metadata Service Protection', () => {
    it.each([
      'http://169.254.169.254/latest/meta-data/',
      'http://169.254.169.254/latest/user-data',
      'http://[::ffff:169.254.169.254]/computeMetadata/v1/',
      'http://metadata.google.internal/computeMetadata/v1/',
      'http://metadata/computeMetadata/v1/',
      'http://instance-data/latest/meta-data/',
    ])('blocks cloud provider metadata access: %s', (url) => {
      expect(() => validateSafeUrl(url)).toThrow(SSRFError);
    });
  });

  describe('IPv6 Link-Local and Unique-Local Addresses', () => {
    it.each([
      'http://[fe80::1]/',
      'http://[fe80::200:5aee:feaa:20a2]/',
      'http://[fc00::1]/internal',
      'http://[fd12:3456:789a:1::1]/',
    ])('blocks IPv6 local address: %s', (url) => {
      expect(() => validateSafeUrl(url)).toThrow(SSRFError);
    });
  });

  describe('Disallowed URL Protocols', () => {
    it.each([
      'file:///etc/passwd',
      'file:///C:/Windows/System32/drivers/etc/hosts',
      'gopher://127.0.0.1:6379/_FLUSHALL',
      'dict://127.0.0.1:11211/stat',
      'ftp://internal-server.local/conf.yaml',
      'ldap://domain-controller.corp/dc=example,dc=com',
      'javascript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
    ])('blocks protocol scheme: %s', (url) => {
      expect(() => validateSafeUrl(url)).toThrow(SSRFError);
    });
  });

  describe('Restricted Internal Service Ports', () => {
    it.each([
      ['SSH', 'http://api.example.com:22/banner'],
      ['SMTP', 'http://api.example.com:25/send'],
      ['SMB', 'http://api.example.com:445/share'],
      ['Docker Daemon', 'http://api.example.com:2375/v1.24/containers/json'],
      ['etcd', 'http://api.example.com:2379/v2/keys'],
      ['MySQL', 'http://api.example.com:3306/ping'],
      ['PostgreSQL', 'http://api.example.com:5432/query'],
      ['PostgreSQL Custom', 'http://api.example.com:5433/query'],
      ['Redis', 'http://api.example.com:6379/info'],
      ['MongoDB', 'http://api.example.com:27017/admin'],
    ])('blocks sensitive port (%s): %s', (_name, url) => {
      expect(() => validateSafeUrl(url)).toThrow(SSRFError);
    });
  });

  describe('Redirect-based SSRF Chain Interception', () => {
    it('detects and aborts redirect to loopback target', async () => {
      const requestOp = httpConnector.operations.get('request')!;

      // Mock an initial request returning a 302 redirect pointing to internal metadata
      const fetchMock = vi.fn().mockResolvedValue({
        status: 302,
        statusText: 'Found',
        headers: new Headers({
          Location: 'http://169.254.169.254/latest/meta-data/',
        }),
      });
      vi.stubGlobal('fetch', fetchMock);

      await expect(
        requestOp.execute(
          { organizationId: 'org-test', executionId: 'exec-test', nodeId: 'node-test' },
          {},
          { url: 'https://legit-external-api.com/redirect', method: 'GET', headers: {}, timeoutMs: 5000 }
        )
      ).rejects.toThrow(SSRFError);

      vi.unstubAllGlobals();
    });

    it('detects and aborts redirect to localhost target', async () => {
      const requestOp = httpConnector.operations.get('request')!;

      const fetchMock = vi.fn().mockResolvedValue({
        status: 301,
        statusText: 'Moved Permanently',
        headers: new Headers({
          Location: 'http://127.0.0.1:5433/internal',
        }),
      });
      vi.stubGlobal('fetch', fetchMock);

      await expect(
        requestOp.execute(
          { organizationId: 'org-test', executionId: 'exec-test', nodeId: 'node-test' },
          {},
          { url: 'https://legit-external-api.com/bounce', method: 'GET', headers: {}, timeoutMs: 5000 }
        )
      ).rejects.toThrow(SSRFError);

      vi.unstubAllGlobals();
    });
  });

  describe('Safe Public Endpoints Verification', () => {
    it.each([
      'https://api.github.com/users',
      'https://httpbin.org/get',
      'https://webhook.site/abc-123',
      'http://example.com/api/v1',
    ])('permits valid public URL: %s', (url) => {
      const parsed = validateSafeUrl(url);
      expect(parsed).toBeInstanceOf(URL);
    });
  });
});
