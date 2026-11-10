/**
 * action:crm — CRM record operations (Phase 3 mock)
 */

import { z } from 'zod';
import type { NodeExecutor, NodeExecutorInput, NodeExecutorOutput } from '../types.js';
import { ExpressionEngine } from '../expression-engine.js';

const CrmConfigSchema = z.object({
  operation: z.enum([
    'create_contact', 'update_contact',
    'create_lead', 'update_lead',
    'get_contact',
  ]),
  data: z.record(z.unknown()).default({}),
  recordId: z.string().optional(),
});

class ActionCrmExecutor implements NodeExecutor {
  readonly nodeType = 'action:crm';
  private readonly expr = new ExpressionEngine();

  async execute({ node, context }: NodeExecutorInput): Promise<NodeExecutorOutput> {
    const rawConfig = this.expr.resolveConfig(node.config ?? {}, context);
    const config = CrmConfigSchema.parse(rawConfig);

    const mockId = config.recordId ?? `mock-${Date.now()}`;
    const record = {
      id: mockId,
      ...config.data,
      createdAt: new Date().toISOString(),
      organizationId: context.organizationId,
      _mock: true,
    };

    return {
      data: { operation: config.operation, record },
      message: `CRM ${config.operation} → id:${mockId} [mock]`,
    };
  }
}

export const actionCrmExecutor = new ActionCrmExecutor();
