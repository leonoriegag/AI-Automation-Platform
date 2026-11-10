import { z } from 'zod';

export const ApprovalStatusEnum = z.enum([
  'PENDING',
  'APPROVED',
  'REJECTED',
  'EXPIRED'
]);

export type ApprovalStatus = z.infer<typeof ApprovalStatusEnum>;

export const ApprovalRequestSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  executionId: z.string().uuid(),
  stepExecutionId: z.string().uuid(),
  nodeId: z.string(),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  payload: z.record(z.string(), z.any()).default({}),
  status: ApprovalStatusEnum.default('PENDING'),
  decidedByUserId: z.string().uuid().optional(),
  decisionNotes: z.string().max(500).optional(),
  decidedAt: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export type ApprovalRequest = z.infer<typeof ApprovalRequestSchema>;

export const ApprovalDecisionInputSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED']),
  decisionNotes: z.string().max(500).optional()
});

export type ApprovalDecisionInput = z.infer<typeof ApprovalDecisionInputSchema>;
