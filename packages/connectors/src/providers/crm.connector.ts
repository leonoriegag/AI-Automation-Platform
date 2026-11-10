import { z } from 'zod';
import type { ConnectorDefinition, ConnectorOperation, ExecutionContext } from '../types.js';

export interface CrmStorageClient {
  findContact(orgId: string, email: string): Promise<any | null>;
  createContact(orgId: string, contact: { email: string; firstName?: string; lastName?: string; company?: string; phone?: string }): Promise<any>;
  createLead(orgId: string, lead: { email: string; title?: string; company?: string; status?: string; score?: number; contactId?: string }): Promise<any>;
  updateLead(orgId: string, leadId: string, patch: { status?: string; score?: number }): Promise<any>;
  addActivity(orgId: string, activity: { type: string; subject: string; contactId?: string; leadId?: string }): Promise<any>;
}

let crmStore: CrmStorageClient | null = null;

export function setCrmStorageClient(client: CrmStorageClient) {
  crmStore = client;
}

// ─── 1. Find Contact ────────────────────────────────────────────────────────
const FindContactInputSchema = z.object({
  email: z.string().email(),
});

export const findContactOperation: ConnectorOperation<Record<string, unknown>, z.infer<typeof FindContactInputSchema>, any> = {
  id: 'findContact',
  name: 'Find Contact by Email',
  description: 'Searches for a CRM contact by normalized email address',
  inputSchema: FindContactInputSchema,
  outputSchema: z.any(),
  isIdempotent: true,
  async execute(context: ExecutionContext, _config: Record<string, unknown>, input: z.infer<typeof FindContactInputSchema>) {
    if (crmStore) {
      const contact = await crmStore.findContact(context.organizationId, input.email);
      return { contact, found: Boolean(contact) };
    }
    return {
      contact: { id: `mock-c-${Date.now()}`, email: input.email, organizationId: context.organizationId },
      found: true,
      _mock: true,
    };
  },
};

// ─── 2. Create Contact ──────────────────────────────────────────────────────
const CreateContactInputSchema = z.object({
  email: z.string().email(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  company: z.string().optional(),
  phone: z.string().optional(),
});

export const createContactOperation: ConnectorOperation<Record<string, unknown>, z.infer<typeof CreateContactInputSchema>, any> = {
  id: 'createContact',
  name: 'Create Contact',
  description: 'Creates a new contact in the organization CRM registry',
  inputSchema: CreateContactInputSchema,
  outputSchema: z.any(),
  isIdempotent: false,
  async execute(context: ExecutionContext, _config: Record<string, unknown>, input: z.infer<typeof CreateContactInputSchema>) {
    if (crmStore) {
      const record = await crmStore.createContact(context.organizationId, input);
      return { contact: record, created: true };
    }
    return {
      contact: { id: `mock-c-${Date.now()}`, ...input, organizationId: context.organizationId },
      created: true,
      _mock: true,
    };
  },
};

// ─── 3. Create Lead ─────────────────────────────────────────────────────────
const CreateLeadInputSchema = z.object({
  email: z.string().email(),
  title: z.string().optional(),
  company: z.string().optional(),
  status: z.enum(['NEW', 'QUALIFIED', 'UNQUALIFIED', 'CONTACTED']).default('NEW'),
  score: z.number().int().default(0),
  contactId: z.string().uuid().optional(),
});

export const createLeadOperation: ConnectorOperation<Record<string, unknown>, z.infer<typeof CreateLeadInputSchema>, any> = {
  id: 'createLead',
  name: 'Create Lead',
  description: 'Registers an inbound lead with initial qualification status and scoring',
  inputSchema: CreateLeadInputSchema,
  outputSchema: z.any(),
  isIdempotent: false,
  async execute(context: ExecutionContext, _config: Record<string, unknown>, input: z.infer<typeof CreateLeadInputSchema>) {
    if (crmStore) {
      const lead = await crmStore.createLead(context.organizationId, input);
      return { lead, created: true };
    }
    return {
      lead: { id: `mock-l-${Date.now()}`, ...input, organizationId: context.organizationId },
      created: true,
      _mock: true,
    };
  },
};

// ─── 4. Update Lead ─────────────────────────────────────────────────────────
const UpdateLeadInputSchema = z.object({
  leadId: z.string().min(1),
  status: z.enum(['NEW', 'QUALIFIED', 'UNQUALIFIED', 'CONTACTED']).optional(),
  score: z.number().int().optional(),
});

export const updateLeadOperation: ConnectorOperation<Record<string, unknown>, z.infer<typeof UpdateLeadInputSchema>, any> = {
  id: 'updateLead',
  name: 'Update Lead',
  description: 'Modifies qualification status or scoring of an existing lead',
  inputSchema: UpdateLeadInputSchema,
  outputSchema: z.any(),
  isIdempotent: true,
  async execute(context: ExecutionContext, _config: Record<string, unknown>, input: z.infer<typeof UpdateLeadInputSchema>) {
    if (crmStore) {
      const updated = await crmStore.updateLead(context.organizationId, input.leadId, {
        status: input.status,
        score: input.score,
      });
      return { lead: updated, updated: true };
    }
    return {
      lead: { id: input.leadId, status: input.status, score: input.score, organizationId: context.organizationId },
      updated: true,
      _mock: true,
    };
  },
};

// ─── 5. Add Activity ────────────────────────────────────────────────────────
const AddActivityInputSchema = z.object({
  type: z.string().default('NOTE'),
  subject: z.string().min(1),
  contactId: z.string().uuid().optional(),
  leadId: z.string().uuid().optional(),
});

export const addActivityOperation: ConnectorOperation<Record<string, unknown>, z.infer<typeof AddActivityInputSchema>, any> = {
  id: 'addActivity',
  name: 'Add CRM Activity',
  description: 'Appends a timeline activity, call log or note to a contact or lead',
  inputSchema: AddActivityInputSchema,
  outputSchema: z.any(),
  isIdempotent: false,
  async execute(context: ExecutionContext, _config: Record<string, unknown>, input: z.infer<typeof AddActivityInputSchema>) {
    if (crmStore) {
      const activity = await crmStore.addActivity(context.organizationId, input);
      return { activity, created: true };
    }
    return {
      activity: { id: `mock-a-${Date.now()}`, ...input, organizationId: context.organizationId },
      created: true,
      _mock: true,
    };
  },
};

export const crmConnector: ConnectorDefinition = {
  id: 'crm',
  name: 'NEXORA CRM',
  category: 'crm',
  description: 'Enterprise contacts, sales leads, and activities CRM service',
  credentialType: 'NONE',
  operations: new Map<string, ConnectorOperation>([
    [findContactOperation.id, findContactOperation],
    [createContactOperation.id, createContactOperation],
    [createLeadOperation.id, createLeadOperation],
    [updateLeadOperation.id, updateLeadOperation],
    [addActivityOperation.id, addActivityOperation],
  ]),
};
