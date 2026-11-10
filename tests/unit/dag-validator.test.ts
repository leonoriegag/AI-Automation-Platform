import { describe, it, expect } from 'vitest';
import { GraphValidator } from '../../packages/workflow-engine/src/graph-validator.js';
import type { WorkflowGraph } from '@nexora/domain';

describe('GraphValidator', () => {
  const validator = new GraphValidator();

  it('validates a linear DAG successfully and outputs topological order', () => {
    const graph: WorkflowGraph = {
      nodes: [
        { id: 'trigger_1', type: 'trigger:manual', name: 'Start', config: {} },
        { id: 'transform_1', type: 'action:transform', name: 'Transform', config: { mapping: {} } },
        { id: 'completion_1', type: 'action:completion', name: 'End', config: {} },
      ],
      edges: [
        { id: 'e1', source: 'trigger_1', target: 'transform_1', sourceHandle: 'default', targetHandle: 'default' },
        { id: 'e2', source: 'transform_1', target: 'completion_1', sourceHandle: 'default', targetHandle: 'default' },
      ],
    };

    const res = validator.validate(graph);
    expect(res.valid).toBe(true);
    expect(res.errors).toHaveLength(0);
    expect(res.topologicalOrder).toEqual(['trigger_1', 'transform_1', 'completion_1']);
  });

  it('detects cycles and returns an error', () => {
    const cyclicGraph: WorkflowGraph = {
      nodes: [
        { id: 'trigger_1', type: 'trigger:manual', name: 'Start', config: {} },
        { id: 'node_a', type: 'action:transform', name: 'A', config: { mapping: {} } },
        { id: 'node_b', type: 'action:transform', name: 'B', config: { mapping: {} } },
      ],
      edges: [
        { id: 'e1', source: 'trigger_1', target: 'node_a', sourceHandle: 'default', targetHandle: 'default' },
        { id: 'e2', source: 'node_a', target: 'node_b', sourceHandle: 'default', targetHandle: 'default' },
        { id: 'e3', source: 'node_b', target: 'node_a', sourceHandle: 'default', targetHandle: 'default' },
      ],
    };

    const res = validator.validate(cyclicGraph);
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.message.includes('Cycle detected'))).toBe(true);
  });

  it('fails if no trigger node is defined', () => {
    const noTriggerGraph: WorkflowGraph = {
      nodes: [
        { id: 'step_1', type: 'action:transform', name: 'A', config: { mapping: {} } },
        { id: 'step_2', type: 'action:completion', name: 'B', config: {} },
      ],
      edges: [
        { id: 'e1', source: 'step_1', target: 'step_2', sourceHandle: 'default', targetHandle: 'default' },
      ],
    };

    const res = validator.validate(noTriggerGraph);
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.message.includes('Workflow must have at least one trigger node'))).toBe(true);
  });

  it('detects unreachable orphan action nodes', () => {
    const orphanGraph: WorkflowGraph = {
      nodes: [
        { id: 'trigger_1', type: 'trigger:manual', name: 'Start', config: {} },
        { id: 'step_1', type: 'action:transform', name: 'Step 1', config: { mapping: {} } },
        { id: 'orphan_node', type: 'action:transform', name: 'Orphan', config: { mapping: {} } },
      ],
      edges: [
        { id: 'e1', source: 'trigger_1', target: 'step_1', sourceHandle: 'default', targetHandle: 'default' },
      ],
    };

    const res = validator.validate(orphanGraph);
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.message.includes('is unreachable'))).toBe(true);
  });

  it('rejects duplicate node IDs', () => {
    const dupGraph: WorkflowGraph = {
      nodes: [
        { id: 'node_1', type: 'trigger:manual', name: 'Start', config: {} },
        { id: 'node_1', type: 'action:transform', name: 'Duplicate', config: { mapping: {} } },
      ],
      edges: [],
    };

    const res = validator.validate(dupGraph);
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.message.includes('Duplicate node ID'))).toBe(true);
  });
});
