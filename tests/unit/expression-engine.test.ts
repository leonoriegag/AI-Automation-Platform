import { describe, it, expect } from 'vitest';
import { ExpressionEngine } from '../../packages/workflow-engine/src/expression-engine.js';
import type { ExecutionContext } from '../../packages/workflow-engine/src/types.js';

describe('ExpressionEngine', () => {
  const engine = new ExpressionEngine();

  const mockContext: ExecutionContext = {
    workflow: { nodes: [], edges: [] },
    executionId: 'exec-123',
    organizationId: 'org-456',
    nodeOutputs: {
      userStep: {
        name: 'Alice',
        company: { title: 'Engineer' }
      },
      calcStep: {
        total: 100
      }
    },
    triggerPayload: {
      event: 'lead.created',
      leadId: 999
    },
    startedAt: new Date('2026-01-01T00:00:00Z'),
    budgetMs: 10000,
  };

  it('interpolates trigger and node outputs into strings', () => {
    const template = 'Event {{ trigger.event }} for {{ nodes.userStep.name }} ({{ nodes.userStep.company.title }})';
    const result = engine.resolveString(template, mockContext);
    expect(result).toBe('Event lead.created for Alice (Engineer)');
  });

  it('interpolates execution metadata', () => {
    const template = 'Running execution {{ execution.id }} for org {{ execution.organizationId }}';
    const result = engine.resolveString(template, mockContext);
    expect(result).toBe('Running execution exec-123 for org org-456');
  });

  it('recursively resolves nested config objects preserving literal primitive types', () => {
    const config = {
      recipient: '{{ nodes.userStep.name }}',
      metadata: {
        lead: '{{ trigger.leadId }}',
        total: '{{ nodes.calcStep.total }}'
      },
      tags: ['tag1', '{{ trigger.event }}']
    };

    const resolved = engine.resolveConfig(config, mockContext);
    expect(resolved).toEqual({
      recipient: 'Alice',
      metadata: {
        lead: 999,
        total: 100
      },
      tags: ['tag1', 'lead.created']
    });
  });
});
