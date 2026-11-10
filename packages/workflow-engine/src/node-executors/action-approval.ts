/**
 * action:approval — human-in-the-loop approval gate (Phase 3 scaffold, auto-approves)
 */

import { z } from 'zod';
import type { NodeExecutor, NodeExecutorInput, NodeExecutorOutput } from '../types.js';
import { ExpressionEngine } from '../expression-engine.js';

const ApprovalConfigSchema = z.object({
  title: z.string(),
  description: z.string().default(''),
  assigneeRole: z.enum(['ADMIN', 'MANAGER', 'OPERATOR']).default('MANAGER'),
  timeoutMs: z.number().int().positive().default(172_800_000),
});

class ActionApprovalExecutor implements NodeExecutor {
  readonly nodeType = 'action:approval';
  private readonly expr = new ExpressionEngine();

  async execute({ node, context }: NodeExecutorInput): Promise<NodeExecutorOutput> {
    const rawConfig = this.expr.resolveConfig(node.config ?? {}, context);
    const config = ApprovalConfigSchema.parse(rawConfig);

    return {
      data: {
        approved: true,
        decision: 'approved',
        decisionNote: '[mock] Auto-approved in Phase 3 scaffold',
        title: config.title,
        assigneeRole: config.assigneeRole,
      },
      message: `Approval "${config.title}" → auto-approved (Phase 3 mock)`,
    };
  }
}

export const actionApprovalExecutor = new ActionApprovalExecutor();
