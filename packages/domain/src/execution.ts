import { z } from 'zod';

export const ExecutionStatusEnum = z.enum([
  'PENDING',
  'RUNNING',
  'WAITING',
  'COMPLETED',
  'FAILED',
  'CANCELLED'
]);

export type ExecutionStatus = z.infer<typeof ExecutionStatusEnum>;

export const StepStatusEnum = z.enum([
  'PENDING',
  'RUNNING',
  'COMPLETED',
  'FAILED',
  'SKIPPED'
]);

export type StepStatus = z.infer<typeof StepStatusEnum>;

export const StepExecutionSchema = z.object({
  id: z.string().uuid(),
  executionId: z.string().uuid(),
  nodeId: z.string(),
  nodeType: z.string(),
  status: StepStatusEnum,
  input: z.any().optional(),
  output: z.any().optional(),
  error: z.string().optional(),
  durationMs: z.number().int().nonnegative().optional(),
  startedAt: z.date().optional(),
  completedAt: z.date().optional(),
  createdAt: z.date()
});

export type StepExecution = z.infer<typeof StepExecutionSchema>;

export const ExecutionSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  workflowId: z.string().uuid(),
  workflowVersion: z.number().int().positive(),
  status: ExecutionStatusEnum,
  triggerType: z.string(),
  triggerPayload: z.any().optional(),
  currentNodeId: z.string().optional(),
  context: z.record(z.string(), z.any()).default({}),
  error: z.string().optional(),
  startedAt: z.date().optional(),
  completedAt: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export type Execution = z.infer<typeof ExecutionSchema>;

export const StartExecutionInputSchema = z.object({
  triggerPayload: z.record(z.string(), z.any()).default({})
});

export type StartExecutionInput = z.infer<typeof StartExecutionInputSchema>;
