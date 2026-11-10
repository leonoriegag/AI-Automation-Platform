/**
 * Graph Validator — Phase 3
 *
 * Validates a WorkflowGraph's node graph using Kahn's topological sort
 * algorithm. Detects cycles, unreachable nodes, missing node references,
 * and duplicate node IDs.
 *
 * Complexity: O(V + E) where V = nodes, E = edges.
 */

import type { WorkflowGraph } from '@nexora/domain';
import type { ValidationResult, ValidationError } from './types.js';

const TRIGGER_TYPES = new Set([
  'trigger:manual',
  'trigger:webhook',
  'trigger:schedule',
]);

export class GraphValidator {
  /**
   * Validate a workflow graph.
   * Returns a ValidationResult with errors and (on success) topological order.
   */
  validate(graph: WorkflowGraph): ValidationResult {
    const errors: ValidationError[] = [];

    const nodes = graph.nodes ?? [];
    const edges = graph.edges ?? [];

    // ── 1. Build node ID set ──────────────────────────────────────────────
    const nodeIds = new Set<string>();
    for (const node of nodes) {
      if (nodeIds.has(node.id)) {
        errors.push({ nodeId: node.id, message: `Duplicate node ID: "${node.id}"` });
      }
      nodeIds.add(node.id);
    }

    if (nodes.length === 0) {
      errors.push({ message: 'Workflow must have at least one node.' });
      return { valid: false, errors };
    }

    // ── 2. Validate edge references ───────────────────────────────────────
    const adjacency: Map<string, string[]> = new Map();
    const inDegree: Map<string, number> = new Map();

    for (const id of nodeIds) {
      adjacency.set(id, []);
      inDegree.set(id, 0);
    }

    for (const edge of edges) {
      if (!nodeIds.has(edge.source)) {
        errors.push({
          message: `Edge references unknown source node: "${edge.source}"`,
        });
        continue;
      }
      if (!nodeIds.has(edge.target)) {
        errors.push({
          message: `Edge references unknown target node: "${edge.target}"`,
        });
        continue;
      }
      adjacency.get(edge.source)!.push(edge.target);
      inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
    }

    if (errors.length > 0) {
      return { valid: false, errors };
    }

    // ── 3. Kahn's algorithm — cycle detection + topological sort ─────────
    const queue: string[] = [];
    for (const [id, deg] of inDegree.entries()) {
      if (deg === 0) queue.push(id);
    }

    const topologicalOrder: string[] = [];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const current = queue.shift()!;
      topologicalOrder.push(current);
      visited.add(current);

      for (const neighbor of adjacency.get(current) ?? []) {
        const newDeg = (inDegree.get(neighbor) ?? 1) - 1;
        inDegree.set(neighbor, newDeg);
        if (newDeg === 0) queue.push(neighbor);
      }
    }

    // ── 4. Cycle detection ────────────────────────────────────────────────
    if (topologicalOrder.length !== nodes.length) {
      const cycleNodes = nodes
        .map((n) => n.id)
        .filter((id) => !visited.has(id));
      errors.push({
        message: `Cycle detected in workflow graph. Involved node(s): ${cycleNodes.join(', ')}`,
      });
      return { valid: false, errors };
    }

    // ── 5. Trigger node requirement ───────────────────────────────────────
    const triggerNodes = nodes.filter((n) => TRIGGER_TYPES.has(n.type));

    if (triggerNodes.length === 0) {
      errors.push({
        message:
          'Workflow must have at least one trigger node (trigger:manual, trigger:webhook, or trigger:schedule).',
      });
    }

    // ── 6. Reachability check from all trigger nodes ──────────────────────
    const reachableFromTrigger = new Set<string>();
    const bfsQueue = triggerNodes.map((n) => n.id);
    for (const id of bfsQueue) reachableFromTrigger.add(id);

    let head = 0;
    while (head < bfsQueue.length) {
      const cur = bfsQueue[head++]!;
      for (const neighbor of adjacency.get(cur) ?? []) {
        if (!reachableFromTrigger.has(neighbor)) {
          reachableFromTrigger.add(neighbor);
          bfsQueue.push(neighbor);
        }
      }
    }

    for (const node of nodes) {
      if (!reachableFromTrigger.has(node.id) && !TRIGGER_TYPES.has(node.type)) {
        errors.push({
          nodeId: node.id,
          message: `Node "${node.id}" (${node.type}) is unreachable from any trigger node.`,
        });
      }
    }

    if (errors.length > 0) {
      return { valid: false, errors };
    }

    return { valid: true, errors: [], topologicalOrder };
  }
}
