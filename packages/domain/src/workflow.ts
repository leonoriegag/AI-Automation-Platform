import { z } from 'zod';

export const WorkflowStatusEnum = z.enum([
  'DRAFT',
  'ACTIVE',
  'INACTIVE',
  'ARCHIVED'
]);

export type WorkflowStatus = z.infer<typeof WorkflowStatusEnum>;

export const NodeTypeEnum = z.enum([
  'trigger:manual',
  'trigger:webhook',
  'trigger:schedule',
  'action:http',
  'action:transform',
  'action:condition',
  'action:delay',
  'action:ai:classify',
  'action:ai:extract',
  'action:agent:tool',
  'action:approval',
  'action:email',
  'action:crm',
  'action:completion'
]);

export type NodeType = z.infer<typeof NodeTypeEnum>;

export const NodeDefinitionSchema = z.object({
  id: z.string().min(1),
  type: NodeTypeEnum,
  name: z.string().min(1).max(100),
  config: z.record(z.string(), z.any()).default({}),
  position: z.object({
    x: z.number(),
    y: z.number()
  }).optional()
});

export type NodeDefinition = z.infer<typeof NodeDefinitionSchema>;

export const EdgeDefinitionSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  sourceHandle: z.string().default('default'),
  targetHandle: z.string().default('default')
});

export type EdgeDefinition = z.infer<typeof EdgeDefinitionSchema>;

export const WorkflowGraphSchema = z.object({
  nodes: z.array(NodeDefinitionSchema).min(1, 'Workflow must contain at least one node'),
  edges: z.array(EdgeDefinitionSchema).default([])
});

export type WorkflowGraph = z.infer<typeof WorkflowGraphSchema>;

export const WorkflowSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  status: WorkflowStatusEnum.default('DRAFT'),
  currentVersion: z.number().int().positive().default(1),
  createdAt: z.date(),
  updatedAt: z.date()
});

export type Workflow = z.infer<typeof WorkflowSchema>;

export const CreateWorkflowInputSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  graph: WorkflowGraphSchema
});

export type CreateWorkflowInput = z.infer<typeof CreateWorkflowInputSchema>;

export const UpdateWorkflowInputSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(500).optional(),
  status: WorkflowStatusEnum.optional(),
  graph: WorkflowGraphSchema.optional()
});

export type UpdateWorkflowInput = z.infer<typeof UpdateWorkflowInputSchema>;
