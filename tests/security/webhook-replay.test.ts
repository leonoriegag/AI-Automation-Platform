import { describe, it, expect, vi, beforeEach } from 'vitest';
import fastify from 'fastify';
import { computeHmac } from '@nexora/shared';

const { mockPrisma } = vi.hoisted(() => {
  return {
    mockPrisma: {
      workflow: {
        findUnique: vi.fn(),
      },
    },
  };
});

vi.mock('../../apps/api/src/plugins/prisma.js', () => ({
  prisma: mockPrisma,
}));

import { webhookTriggerRoutes } from '../../apps/api/src/routes/webhook-trigger.routes.js';
import { WorkflowExecutionService } from '../../apps/api/src/services/execution.service.js';

describe('Webhook Security: HMAC Signatures & Anti-Replay Verification', () => {
  const secretKey = 'test-webhook-hmac-secret-super-secure';
  const workflowId = 'wf-webhook-sec-001';
  const orgId = 'org-webhook-sec-001';

  beforeEach(() => {
    vi.spyOn(WorkflowExecutionService.prototype, 'runWorkflow').mockResolvedValue({
      executionId: 'mock-exec-webhook-sec',
      status: 'COMPLETED' as any,
      durationMs: 42,
      steps: [],
      finalOutput: { success: true },
    });
  });

  async function createTestApp(active = true, configuredSecret?: string) {
    const app = fastify({ logger: false });

    const mockWorkflow = active
      ? {
          id: workflowId,
          organizationId: orgId,
          name: 'Secure Webhook Flow',
          status: 'ACTIVE',
          versions: [
            {
              version: 1,
              graph: {
                nodes: [
                  {
                    id: 'node-trigger',
                    type: 'trigger:webhook',
                    config: {
                      secret: configuredSecret !== undefined ? configuredSecret : secretKey,
                    },
                  },
                ],
                edges: [],
              },
            },
          ],
        }
      : {
          id: workflowId,
          organizationId: orgId,
          name: 'Inactive Webhook Flow',
          status: 'DRAFT',
          versions: [],
        };

    mockPrisma.workflow.findUnique.mockResolvedValue(mockWorkflow);

    await app.register(webhookTriggerRoutes);
    await app.ready();
    return app;
  }

  it('accepts valid HMAC signature within the 300-second replay window', async () => {
    const app = await createTestApp(true, secretKey);

    const timestamp = Math.floor(Date.now() / 1000) - 10; // 10 seconds ago (fresh)
    const payload = { event: 'order.placed', orderId: 'ord-88331', amount: 120.5 };
    const bodyStr = JSON.stringify(payload);
    const signature = computeHmac(`${timestamp}.${bodyStr}`, secretKey);

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/webhooks/${workflowId}`,
      headers: {
        'content-type': 'application/json',
        'x-nexora-timestamp': timestamp.toString(),
        'x-nexora-signature': `sha256=${signature}`,
      },
      payload,
    });

    expect(response.statusCode).toBe(202);
    const body = JSON.parse(response.body);
    expect(body.accepted).toBe(true);
    expect(body.workflowId).toBe(workflowId);
  });

  it('rejects replayed requests with timestamp older than 300 seconds', async () => {
    const app = await createTestApp(true, secretKey);

    const staleTimestamp = Math.floor(Date.now() / 1000) - 305; // 5 minutes 5 seconds ago
    const payload = { event: 'invoice.paid', invoiceId: 'inv-992' };
    const bodyStr = JSON.stringify(payload);
    const signature = computeHmac(`${staleTimestamp}.${bodyStr}`, secretKey);

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/webhooks/${workflowId}`,
      headers: {
        'content-type': 'application/json',
        'x-nexora-timestamp': staleTimestamp.toString(),
        'x-nexora-signature': `sha256=${signature}`,
      },
      payload,
    });

    expect(response.statusCode).toBe(401);
    const body = JSON.parse(response.body);
    expect(body.message).toContain('replay tolerance window');
  });

  it('rejects requests with future drift timestamp exceeding 300 seconds', async () => {
    const app = await createTestApp(true, secretKey);

    const futureTimestamp = Math.floor(Date.now() / 1000) + 400; // 400s in future
    const payload = { event: 'ping' };
    const bodyStr = JSON.stringify(payload);
    const signature = computeHmac(`${futureTimestamp}.${bodyStr}`, secretKey);

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/webhooks/${workflowId}`,
      headers: {
        'content-type': 'application/json',
        'x-nexora-timestamp': futureTimestamp.toString(),
        'x-nexora-signature': `sha256=${signature}`,
      },
      payload,
    });

    expect(response.statusCode).toBe(401);
    const body = JSON.parse(response.body);
    expect(body.message).toContain('replay tolerance window');
  });

  it('rejects requests with malformed non-numeric timestamps', async () => {
    const app = await createTestApp(true, secretKey);

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/webhooks/${workflowId}`,
      headers: {
        'content-type': 'application/json',
        'x-nexora-timestamp': 'invalid-timestamp-abc',
        'x-nexora-signature': 'sha256=abcdef1234567890',
      },
      payload: { test: true },
    });

    expect(response.statusCode).toBe(401);
  });

  it('rejects tampered payloads even with authentic timestamp', async () => {
    const app = await createTestApp(true, secretKey);

    const timestamp = Math.floor(Date.now() / 1000);
    const originalPayload = { amount: 100 };
    const tamperedPayload = { amount: 1000000 }; // Attacker tampered with amount!
    const signature = computeHmac(`${timestamp}.${JSON.stringify(originalPayload)}`, secretKey);

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/webhooks/${workflowId}`,
      headers: {
        'content-type': 'application/json',
        'x-nexora-timestamp': timestamp.toString(),
        'x-nexora-signature': `sha256=${signature}`,
      },
      payload: tamperedPayload,
    });

    expect(response.statusCode).toBe(401);
    const body = JSON.parse(response.body);
    expect(body.message).toContain('Invalid HMAC webhook signature');
  });

  it('rejects missing signature header when secret is configured', async () => {
    const app = await createTestApp(true, secretKey);

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/webhooks/${workflowId}`,
      headers: {
        'content-type': 'application/json',
      },
      payload: { hello: 'world' },
    });

    expect(response.statusCode).toBe(401);
    const body = JSON.parse(response.body);
    expect(body.message).toContain('Missing required HMAC webhook signature header');
  });

  it('rejects webhook requests for INACTIVE or DRAFT workflows', async () => {
    const app = await createTestApp(false); // Inactive

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/webhooks/${workflowId}`,
      headers: { 'content-type': 'application/json' },
      payload: { test: true },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.error).toContain('Workflow is not currently ACTIVE');
  });
});
