import { describe, it, expect } from 'vitest';
import {
  DagExecutor,
  createDefaultRegistry,
} from '../../packages/workflow-engine/src/index.js';
import type { WorkflowGraph } from '@nexora/domain';
import type { ExecutionContext } from '../../packages/workflow-engine/src/types.js';

describe('DagExecutor & Builtin Executors', () => {
  const registry = createDefaultRegistry();
  const executor = new DagExecutor(registry);

  const baseContext = (workflow: WorkflowGraph, payload: unknown = {}): ExecutionContext => ({
    workflow,
    executionId: 'exec-test-1',
    organizationId: '692d98e8-9b60-41dd-aead-db4559878d70',
    nodeOutputs: {},
    triggerPayload: payload,
    startedAt: new Date(),
    budgetMs: 15000,
  });

  it('executes a linear flow (trigger -> transform -> completion)', async () => {
    const graph: WorkflowGraph = {
      nodes: [
        {
          id: 'manual_start',
          type: 'trigger:manual',
          name: 'Manual Trigger',
          config: {},
        },
        {
          id: 'transform_data',
          type: 'action:transform',
          name: 'Format Data',
          config: {
            mapping: {
              greeting: 'Hello {{ trigger.firstName }} {{ trigger.lastName }}!',
              userRole: '{{ trigger.role }}',
            },
          },
        },
        {
          id: 'finish',
          type: 'action:completion',
          name: 'Done',
          config: {
            summary: 'Finished processing for {{ nodes.transform_data.greeting }}',
            outputs: ['transform_data'],
          },
        },
      ],
      edges: [
        { id: 'e1', source: 'manual_start', target: 'transform_data', sourceHandle: 'default', targetHandle: 'default' },
        { id: 'e2', source: 'transform_data', target: 'finish', sourceHandle: 'default', targetHandle: 'default' },
      ],
    };

    const ctx = baseContext(graph, { firstName: 'Bruce', lastName: 'Wayne', role: 'Hero' });
    const res = await executor.execute(graph, ctx);

    expect(res.status).toBe('COMPLETED');
    expect(res.steps).toHaveLength(3);
    expect(res.steps.every((s) => s.status === 'COMPLETED')).toBe(true);

    const transformOutput = ctx.nodeOutputs['transform_data'] as Record<string, string>;
    expect(transformOutput.greeting).toBe('Hello Bruce Wayne!');
    expect(transformOutput.userRole).toBe('Hero');

    const completionOutput = ctx.nodeOutputs['finish'] as Record<string, any>;
    expect(completionOutput.summary).toBe('Finished processing for Hello Bruce Wayne!');
    expect(completionOutput.outputs.transform_data).toEqual(transformOutput);
  });

  it('evaluates conditions and correctly takes matching branch', async () => {
    const graph: WorkflowGraph = {
      nodes: [
        {
          id: 'trigger',
          type: 'trigger:manual',
          name: 'Start',
          config: {},
        },
        {
          id: 'cond',
          type: 'action:condition',
          name: 'Check Score',
          config: {
            left: '{{ trigger.score }}',
            operator: '>=',
            right: '80',
          },
        },
        {
          id: 'high_priority',
          type: 'action:transform',
          name: 'High Priority',
          config: { mapping: { tier: 'VIP' } },
        },
        {
          id: 'low_priority',
          type: 'action:transform',
          name: 'Low Priority',
          config: { mapping: { tier: 'STANDARD' } },
        },
      ],
      edges: [
        { id: 'e1', source: 'trigger', target: 'cond', sourceHandle: 'default', targetHandle: 'default' },
        { id: 'e2', source: 'cond', target: 'high_priority', sourceHandle: 'default', targetHandle: 'default', ...({ label: 'true' } as any) },
        { id: 'e3', source: 'cond', target: 'low_priority', sourceHandle: 'default', targetHandle: 'default', ...({ label: 'false' } as any) },
      ],
    };

    // Score = 95 => high_priority taken, low_priority skipped
    const ctxHigh = baseContext(graph, { score: 95 });
    const resHigh = await executor.execute(graph, ctxHigh);

    expect(resHigh.status).toBe('COMPLETED');
    const highStep = resHigh.steps.find((s) => s.nodeId === 'high_priority');
    const lowStep = resHigh.steps.find((s) => s.nodeId === 'low_priority');
    expect(highStep?.status).toBe('COMPLETED');
    expect(lowStep?.status).toBe('SKIPPED');
    expect(ctxHigh.nodeOutputs['high_priority']).toEqual({ tier: 'VIP' });
    expect(ctxHigh.nodeOutputs['low_priority']).toBeUndefined();
  });

  it('runs AI classification and extraction mock nodes', async () => {
    const graph: WorkflowGraph = {
      nodes: [
        { id: 'start', type: 'trigger:manual', name: 'Start', config: {} },
        {
          id: 'classify',
          type: 'action:ai:classify',
          name: 'Classify Email',
          config: {
            inputTemplate: '{{ trigger.subject }}',
            categories: ['support', 'billing', 'sales'],
            provider: 'mock',
          },
        },
        {
          id: 'extract',
          type: 'action:ai:extract',
          name: 'Extract Details',
          config: {
            inputTemplate: '{{ trigger.body }}',
            schema: {
              accountNumber: { type: 'string', description: 'Account number' },
              amount: { type: 'number', description: 'Due amount' },
            },
            provider: 'mock',
          },
        },
      ],
      edges: [
        { id: 'e1', source: 'start', target: 'classify', sourceHandle: 'default', targetHandle: 'default' },
        { id: 'e2', source: 'classify', target: 'extract', sourceHandle: 'default', targetHandle: 'default' },
      ],
    };

    const ctx = baseContext(graph, {
      subject: 'Urgent invoice inquiry',
      body: 'accountNumber: ACC-9921 amount 450.50 please check',
    });

    const res = await executor.execute(graph, ctx);
    expect(res.status).toBe('COMPLETED');

    const classifyOut = ctx.nodeOutputs['classify'] as any;
    expect(['support', 'billing', 'sales']).toContain(classifyOut.category);
    expect(classifyOut.confidence).toBeGreaterThan(0.5);

    const extractOut = ctx.nodeOutputs['extract'] as any;
    expect(extractOut.accountNumber).toBe('ACC-9921');
    expect(extractOut.amount).toBe(450.5);
  });
});
