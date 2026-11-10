import { z } from 'zod';

export const AuditActionEnum = z.enum([
  'WORKFLOW_CREATED',
  'WORKFLOW_UPDATED',
  'WORKFLOW_DELETED',
  'WORKFLOW_ACTIVATED',
  'WORKFLOW_DEACTIVATED',
  'WORKFLOW_EXECUTED',
  'CREDENTIAL_CREATED',
  'CREDENTIAL_DELETED',
  'APPROVAL_GRANTED',
  'APPROVAL_REJECTED',
  'EXECUTION_CANCELLED',
  'USER_LOGIN',
  'SECURITY_POLICY_VIOLATION'
]);

export type AuditAction = z.infer<typeof AuditActionEnum>;

export const AuditLogSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  userId: z.string().uuid().optional(),
  action: AuditActionEnum,
  resourceType: z.string(),
  resourceId: z.string().optional(),
  metadata: z.record(z.string(), z.any()).default({}),
  ipAddress: z.string().optional(),
  createdAt: z.date()
});

export type AuditLog = z.infer<typeof AuditLogSchema>;

export const CreateAuditLogInputSchema = z.object({
  organizationId: z.string().uuid(),
  userId: z.string().uuid().optional(),
  action: AuditActionEnum,
  resourceType: z.string(),
  resourceId: z.string().optional(),
  metadata: z.record(z.string(), z.any()).default({}),
  ipAddress: z.string().optional()
});

export type CreateAuditLogInput = z.infer<typeof CreateAuditLogInputSchema>;
