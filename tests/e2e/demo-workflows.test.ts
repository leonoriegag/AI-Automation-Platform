import { describe, it, expect, vi } from 'vitest';
import {
  leadCaptureWorkflowGraph,
  customerSupportWorkflowGraph,
  invoiceProcessingWorkflowGraph,
  dataSyncWorkflowGraph,
} from '@nexora/domain';
import {
  DagExecutor,
  createDefaultRegistry,
  type ExecutionContext,
} from '../../packages/workflow-engine/src/index.js';

describe('Phase 7 — End-to-End Demo Workflows', () => {
  const registry = createDefaultRegistry();
  const executor = new DagExecutor(registry);

  const createCtx = (workflow: any, payload: unknown): ExecutionContext => ({
    workflow,
    executionId: `exec-e2e-${Math.random().toString(36).slice(2, 8)}`,
    organizationId: '692d98e8-9b60-41dd-aead-db4559878d70',
    nodeOutputs: {},
    triggerPayload: payload,
    startedAt: new Date(),
    budgetMs: 30000,
  });

  // ─── 1. Workflow A: Lead Capture & Qualification ──────────────────────────
  describe('Workflow A: Inbound Lead Capture & Qualification', () => {
    it('processes enterprise inquiry -> classifies -> extracts -> creates lead -> notifies sales', async () => {
      const payload = {
        email: 'cto@acmecorp.com',
        inquiryText: 'Company Acme Corp interested in enterprise automation platform for 500 seats',
      };

      const ctx = createCtx(leadCaptureWorkflowGraph, payload);
      const res = await executor.execute(leadCaptureWorkflowGraph, ctx);

      expect(res.status).toBe('COMPLETED');
      expect(res.steps.length).toBeGreaterThanOrEqual(6);

      // Verify AI outputs
      expect(ctx.nodeOutputs['ai_classify_intent']).toBeDefined();
      expect(ctx.nodeOutputs['ai_extract_details']).toBeDefined();

      // Verify that the completion summary includes expected outputs
      const completionOut = ctx.nodeOutputs['completion_summary'] as any;
      expect(completionOut.summary).toContain('cto@acmecorp.com');
      expect(completionOut.outputs.ai_classify_intent).toBeDefined();
    });
  });

  // ─── 2. Workflow B: Customer Support Triage ───────────────────────────────
  describe('Workflow B: Customer Support Triage', () => {
    it('triages customer issue and follows conditional emergency or standard branch', async () => {
      // Mock fetch for the slack notification HTTP node so it runs offline cleanly
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ ok: true }),
        text: async () => JSON.stringify({ ok: true }),
      });
      vi.stubGlobal('fetch', fetchMock);

      const payload = {
        email: 'ops@client.com',
        subject: 'Database connection failure',
        message: 'All queries timing out on primary cluster',
      };

      const ctx = createCtx(customerSupportWorkflowGraph, payload);
      const res = await executor.execute(customerSupportWorkflowGraph, ctx);

      expect(res.status).toBe('COMPLETED');
      expect(res.steps.some((s) => s.nodeId === 'ai_triage_urgency')).toBe(true);

      const triageOut = ctx.nodeOutputs['triage_completion'] as any;
      expect(triageOut).toBeDefined();
      expect(triageOut.summary).toContain('Support triage completed');

      vi.unstubAllGlobals();
    });
  });

  // ─── 3. Workflow C: Invoice Processing & Approval ─────────────────────────
  describe('Workflow C: Invoice Processing & Approval Gate', () => {
    it('extracts invoice data and passes human approval gate for payment settlement', async () => {
      const payload = {
        rawText: 'Invoice Number: INV-2026-904 Vendor: CloudScale Systems Amount: 14500.00 USD for GPU clusters',
      };

      const ctx = createCtx(invoiceProcessingWorkflowGraph, payload);
      const res = await executor.execute(invoiceProcessingWorkflowGraph, ctx);

      expect(res.status).toBe('COMPLETED');

      // AI extract step
      const extract = ctx.nodeOutputs['ai_extract_invoice'] as any;
      expect(extract).toBeDefined();

      // Verification of approval and payment dispatch
      const payment = ctx.nodeOutputs['payment_dispatch'] as any;
      expect(payment).toBeDefined();
      expect(payment.to).toBe('accounts-payable@enterprise.com');

      const completion = ctx.nodeOutputs['invoice_completion'] as any;
      expect(completion.summary).toContain('Invoice processing completed');
    });
  });

  // ─── 4. Workflow D: Cross-System Scheduled Data Sync ──────────────────────
  describe('Workflow D: Cross-System Scheduled Data Sync', () => {
    it('executes scheduled cron sync, fetches remote state, transforms, and updates CRM', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'text/plain' }),
        text: async () => 'Practicality beats purity.',
      });
      vi.stubGlobal('fetch', fetchMock);

      const payload = {
        scheduledCron: '0 2 * * *',
        firedAt: new Date().toISOString(),
      };

      const ctx = createCtx(dataSyncWorkflowGraph, payload);
      const res = await executor.execute(dataSyncWorkflowGraph, ctx);

      expect(res.status).toBe('COMPLETED');

      const transformOut = ctx.nodeOutputs['transform_payload'] as any;
      expect(transformOut.syncedStatus).toBe('SUCCESS');
      expect(transformOut.externalQuote).toBe('Practicality beats purity.');

      const crmOut = ctx.nodeOutputs['sync_crm_contact'] as any;
      expect(crmOut.operation).toBe('create_contact');
      expect(crmOut.record.email).toBe('sync-auditor@nexora.io');

      const completion = ctx.nodeOutputs['data_sync_completion'] as any;
      expect(completion.summary).toContain('Cross-system data sync finalized successfully');

      vi.unstubAllGlobals();
    });
  });
});
