/**
 * DAG Executor — Phase 3
 */

import { logger, ExecutionBudgetExceededError } from '@nexora/shared';
import type { WorkflowGraph, NodeDefinition } from '@nexora/domain';
import { GraphValidator } from './graph-validator.js';
import { NodeRegistry } from './node-registry.js';
import {
  DEFAULT_RETRY_POLICY,
  waitBeforeRetry,
  type RetryPolicy,
} from './retry-policy.js';
import type {
  ExecutionContext,
  NodeExecutorOutput,
  ValidationResult,
} from './types.js';

export interface DagExecutorOptions {
  retryPolicy?: RetryPolicy;
}

export interface StepResult {
  nodeId: string;
  nodeType: string;
  status: 'COMPLETED' | 'FAILED' | 'SKIPPED';
  output?: NodeExecutorOutput;
  error?: string;
  attempts: number;
  durationMs: number;
}

export interface ExecutionResult {
  executionId: string;
  status: 'COMPLETED' | 'FAILED';
  steps: StepResult[];
  finalOutput?: unknown;
  error?: string;
  durationMs: number;
}

export class DagExecutor {
  private readonly validator = new GraphValidator();

  constructor(
    private readonly registry: NodeRegistry,
    private readonly options: DagExecutorOptions = {}
  ) {}

  async execute(
    graph: WorkflowGraph,
    context: ExecutionContext
  ): Promise<ExecutionResult> {
    const wallStart = Date.now();

    // ── 1. Validate graph ─────────────────────────────────────────────────
    const validation: ValidationResult = this.validator.validate(graph);
    if (!validation.valid) {
      const error = validation.errors.map((e) => e.message).join('; ');
      logger.error('Workflow graph validation failed', undefined, { executionId: context.executionId, error });
      return {
        executionId: context.executionId,
        status: 'FAILED',
        steps: [],
        error,
        durationMs: Date.now() - wallStart,
      };
    }

    const topologicalOrder = validation.topologicalOrder!;
    const nodeMap = new Map<string, NodeDefinition>(
      (graph.nodes ?? []).map((n) => [n.id, n])
    );

    type EdgeTarget = { target: string; label?: string };
    const edgesFrom = new Map<string, EdgeTarget[]>();
    for (const edge of graph.edges ?? []) {
      const list = edgesFrom.get(edge.source) ?? [];
      list.push({ target: edge.target, label: (edge as { label?: string }).label });
      edgesFrom.set(edge.source, list);
    }

    const skippedNodes = new Set<string>();
    const steps: StepResult[] = [];
    const retryPolicy = this.options.retryPolicy ?? DEFAULT_RETRY_POLICY;

    // ── 2. Execute in topological order ───────────────────────────────────
    for (const nodeId of topologicalOrder) {
      if (Date.now() - wallStart > context.budgetMs) {
        throw new ExecutionBudgetExceededError(
          `Execution ${context.executionId} exceeded budget of ${context.budgetMs}ms`
        );
      }

      const node = nodeMap.get(nodeId)!;
      const stepStart = Date.now();

      if (skippedNodes.has(nodeId)) {
        steps.push({ nodeId, nodeType: node.type, status: 'SKIPPED', attempts: 0, durationMs: 0 });
        for (const { target } of edgesFrom.get(nodeId) ?? []) {
          skippedNodes.add(target);
        }
        continue;
      }

      let lastError: Error | null = null;
      let output: NodeExecutorOutput | undefined;
      let attempt = 0;

      while (attempt < retryPolicy.maxAttempts) {
        attempt++;
        try {
          const executor = this.registry.get(node.type);
          output = await executor.execute({ node, context });
          lastError = null;
          break;
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
          logger.warn('Node execution failed — will retry', { nodeId, attempt, error: lastError.message, executionId: context.executionId });
          if (attempt < retryPolicy.maxAttempts) {
            await waitBeforeRetry(nodeId, attempt, retryPolicy);
          }
        }
      }

      const durationMs = Date.now() - stepStart;

      if (lastError) {
        logger.error('Node failed after all retry attempts', undefined, { nodeId, attempts: attempt, error: lastError.message, executionId: context.executionId });
        steps.push({ nodeId, nodeType: node.type, status: 'FAILED', error: lastError.message, attempts: attempt, durationMs });
        for (const { target } of edgesFrom.get(nodeId) ?? []) {
          skippedNodes.add(target);
        }
        continue;
      }

      context.nodeOutputs[nodeId] = output!.data;
      steps.push({ nodeId, nodeType: node.type, status: 'COMPLETED', output: output!, attempts: attempt, durationMs });

      logger.info(output!.message ?? 'Node completed', { nodeId, nodeType: node.type, durationMs, executionId: context.executionId });

      // ── Condition branch handling ──────────────────────────────────────
      const outputData = output!.data as Record<string, unknown> | null;
      const branch =
        outputData && typeof outputData === 'object' && 'branch' in outputData
          ? String(outputData['branch'])
          : null;

      if (branch !== null) {
        for (const { target, label } of edgesFrom.get(nodeId) ?? []) {
          if (label !== undefined && label !== branch) {
            skippedNodes.add(target);
          }
        }
      }
    }

    const failed = steps.filter((s) => s.status === 'FAILED');
    const status = failed.length === 0 ? 'COMPLETED' : 'FAILED';
    const lastCompleted = [...steps].reverse().find((s) => s.status === 'COMPLETED');
    const finalOutput = lastCompleted?.output?.data;

    return {
      executionId: context.executionId,
      status,
      steps,
      finalOutput,
      error: failed.map((s) => `${s.nodeId}: ${s.error}`).join('; ') || undefined,
      durationMs: Date.now() - wallStart,
    };
  }
}
