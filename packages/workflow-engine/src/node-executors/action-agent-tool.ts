/**
 * action:agent:tool — bounded AI agent loop (Phase 3 scaffold)
 */

import { z } from 'zod';
import type { NodeExecutor, NodeExecutorInput, NodeExecutorOutput } from '../types.js';
import { ExpressionEngine } from '../expression-engine.js';

const AgentToolConfigSchema = z.object({
  goal: z.string(),
  tools: z.array(z.string()).default([]),
  maxIterations: z.number().int().positive().default(5),
  provider: z.enum(['mock', 'openai']).default('mock'),
});

class ActionAgentToolExecutor implements NodeExecutor {
  readonly nodeType = 'action:agent:tool';
  private readonly expr = new ExpressionEngine();

  async execute({ node, context }: NodeExecutorInput): Promise<NodeExecutorOutput> {
    const rawConfig = this.expr.resolveConfig(node.config ?? {}, context);
    const config = AgentToolConfigSchema.parse(rawConfig);

    return {
      data: {
        goal: config.goal,
        toolsUsed: config.tools.slice(0, 2),
        iterations: 1,
        result: `[mock] Goal "${config.goal}" completed in 1 iteration`,
        provider: config.provider,
      },
      message: `Agent completed goal: "${config.goal}"`,
    };
  }
}

export const actionAgentToolExecutor = new ActionAgentToolExecutor();
