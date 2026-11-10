import { z } from 'zod';

export const CrmLeadStatusEnum = z.enum([
  'NEW',
  'QUALIFIED',
  'DISQUALIFIED',
  'CONTACTED',
  'PROPOSAL_SENT',
  'WON',
  'LOST'
]);

export type CrmLeadStatus = z.infer<typeof CrmLeadStatusEnum>;

export const CrmContactSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  email: z.string().email(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  company: z.string().max(150).optional(),
  phone: z.string().max(50).optional(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export type CrmContact = z.infer<typeof CrmContactSchema>;

export const CrmLeadSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  contactId: z.string().uuid().optional(),
  title: z.string().min(1).max(200),
  status: CrmLeadStatusEnum.default('NEW'),
  score: z.number().int().min(0).max(100).default(0),
  estimatedValue: z.number().nonnegative().default(0),
  assignedTo: z.string().optional(),
  metadata: z.record(z.string(), z.any()).default({}),
  createdAt: z.date(),
  updatedAt: z.date()
});

export type CrmLead = z.infer<typeof CrmLeadSchema>;

export const CrmActivitySchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  entityType: z.enum(['CONTACT', 'LEAD']),
  entityId: z.string().uuid(),
  type: z.enum(['NOTE', 'EMAIL', 'CALL', 'STATUS_CHANGE']),
  content: z.string().max(2000),
  createdAt: z.date()
});

export type CrmActivity = z.infer<typeof CrmActivitySchema>;
