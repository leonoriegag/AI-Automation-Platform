import { describe, it, expect, vi } from 'vitest';
import {
  validateSafeUrl,
  httpConnector,
  webhookConnector,
  emailConnector,
  slackConnector,
  crmConnector,
  ConnectorRegistry,
} from '../../packages/connectors/src/index.js';
import { SSRFError } from '@nexora/shared';

describe('Connectors Framework — Phase 4', () => {
  it('registers all default enterprise connectors in the singleton registry', () => {
    const registry = ConnectorRegistry.getInstance();
    const connectors = registry.list();
    const ids = connectors.map((c) => c.id);

    expect(ids).toContain('http');
    expect(ids).toContain('webhook');
    expect(ids).toContain('email');
    expect(ids).toContain('slack');
    expect(ids).toContain('crm');
  });

  describe('SSRF Protection Guard', () => {
    it('blocks localhost and loopback targets', () => {
      expect(() => validateSafeUrl('http://localhost:8080/admin')).toThrow(SSRFError);
      expect(() => validateSafeUrl('http://127.0.0.1:5432/api')).toThrow(SSRFError);
      expect(() => validateSafeUrl('http://[::1]:3000/status')).toThrow(SSRFError);
    });

    it('blocks private IPv4 subnet destinations', () => {
      expect(() => validateSafeUrl('http://10.0.0.1/internal')).toThrow(SSRFError);
      expect(() => validateSafeUrl('https://172.16.5.100/data')).toThrow(SSRFError);
      expect(() => validateSafeUrl('http://192.168.1.1/router')).toThrow(SSRFError);
    });

    it('blocks cloud metadata endpoint (169.254.169.254)', () => {
      expect(() => validateSafeUrl('http://169.254.169.254/latest/meta-data/')).toThrow(SSRFError);
    });

    it('allows valid public internet domains', () => {
      const parsed = validateSafeUrl('https://api.github.com/repos');
      expect(parsed.hostname).toBe('api.github.com');
      expect(parsed.protocol).toBe('https:');
    });
  });

  describe('Outbound Webhook Connector & HMAC Signature', () => {
    it('executes signed outbound dispatch with replay headers', async () => {
      const sendOp = webhookConnector.operations.get('send')!;
      expect(sendOp).toBeDefined();

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ received: true }),
      });
      vi.stubGlobal('fetch', fetchMock);

      const res = await sendOp.execute(
        { organizationId: 'org-1', executionId: 'exec-webhook-1', nodeId: 'node-1' },
        {},
        {
          url: 'https://webhook.site/test-hook',
          payload: { event: 'user.signup', email: 'test@nexora.io' },
          signingSecret: 'super-secret-hmac-key',
        }
      );

      expect(res.delivered).toBe(true);
      expect(res.status).toBe(200);
      expect(res.signatureSent).toBeDefined();
      expect(fetchMock).toHaveBeenCalled();

      const callArgs = fetchMock.mock.calls[0];
      const headers = callArgs[1].headers;
      expect(headers.get('X-Nexora-Signature')).toContain('sha256=');
      expect(headers.get('X-Nexora-Timestamp')).toBeDefined();
      expect(headers.get('X-Nexora-Delivery')).toBe('exec-webhook-1');

      vi.unstubAllGlobals();
    });
  });

  describe('CRM Connector Operations', () => {
    it('executes contact and lead operations in mock mode', async () => {
      const createContact = crmConnector.operations.get('createContact')!;
      const createLead = crmConnector.operations.get('createLead')!;
      const updateLead = crmConnector.operations.get('updateLead')!;

      const ctx = { organizationId: 'org-crm', executionId: 'exec-crm', nodeId: 'node-crm' };

      const contactRes = await createContact.execute(ctx, {}, {
        email: 'lead@enterprise.com',
        firstName: 'John',
        lastName: 'Doe',
        company: 'Enterprise Inc',
      });
      expect(contactRes.created).toBe(true);
      expect(contactRes.contact.email).toBe('lead@enterprise.com');

      const leadRes = await createLead.execute(ctx, {}, {
        email: 'lead@enterprise.com',
        title: 'VP of Engineering',
        company: 'Enterprise Inc',
        score: 85,
        status: 'QUALIFIED',
      });
      expect(leadRes.created).toBe(true);
      expect(leadRes.lead.score).toBe(85);

      const updateRes = await updateLead.execute(ctx, {}, {
        leadId: leadRes.lead.id,
        status: 'CONTACTED',
        score: 95,
      });
      expect(updateRes.updated).toBe(true);
      expect(updateRes.lead.status).toBe('CONTACTED');
    });
  });

  describe('Slack-Compatible Connector', () => {
    it('records slack messages offline without throwing', async () => {
      const postOp = slackConnector.operations.get('postMessage')!;
      const res = await postOp.execute(
        { organizationId: 'org-slack', executionId: 'exec-slack', nodeId: 'node-slack' },
        {},
        {
          channel: '#alerts',
          text: 'Deployment successful',
        }
      );

      expect(res.success).toBe(true);
      expect(res.mode).toBe('MOCK_RECORDED');
      expect(res.channel).toBe('#alerts');
    });
  });
});
