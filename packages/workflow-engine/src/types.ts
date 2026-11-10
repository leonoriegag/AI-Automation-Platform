/**
 * Workflow Engine — shared internal types
 * All types that cross module boundaries within the engine live here.
 */

import type { WorkflowGraph, NodeDefinition } from '@nexora/domain';

// ─── Execution Context ───────────────────────────────────────────────────────

/**
 * Data available to every node executor during a workflow run.
 */
export interface ExecutionContext {
  /** The workflow graph being executed */
  workflow: WorkflowGraph;
  /** Current execution ID (UUID) */
  executionId: string;
  /** Organization ID — tenant isolation key */
  organizationId: string;
  /** Output keyed by node ID, populated as nodes complete */
  nodeOutputs: Record<string, unknown>;
  /** Trigger payload that started this execution */
  triggerPayload: unknown;
  /** Wall-clock time the execution started */
  startedAt: Date;
  /** Maximum allowed execution time in ms */
  budgetMs: number;
}

// ─── Node Executor Contract ───────────────────────────────────────────────────

export interface NodeExecutorInput {
  node: NodeDefinition;
  context: ExecutionContext;
}

export interface NodeExecutorOutput {
  /** Arbitrary output data passed downstream */
  data: unknown;
  /** Descriptive status message for the UI */
  message?: string;
}

export interface NodeExecutor {
  /** Must match the NodeTypeEnum string value exactly */
  readonly nodeType: string;
  execute(input: NodeExecutorInput): Promise<NodeExecutorOutput>;
}

// ─── Validation Result ────────────────────────────────────────────────────────

export interface ValidationError {
  nodeId?: string;
  field?: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  /** Nodes ordered by topological sort (only set when valid) */
  topologicalOrder?: string[];
}

// ─── Step State ───────────────────────────────────────────────────────────────

export type StepStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'SKIPPED'
  | 'WAITING';

// ─── Retry Policy (re-exported from retry-policy for convenience) ─────────────
export type { RetryPolicy } from './retry-policy.js';
