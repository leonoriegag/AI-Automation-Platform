/**
 * action:completion — terminal node that marks workflow as done
 */

import { z } from 'zod';
import type { NodeExecutor, NodeExecutorInput, NodeExecutorOutput } from '../types.js';
import { ExpressionEngine } from '../expression-engine.js';

const CompletionConfigSchema = z.object({
  summary: z.string().default('Workflow completed successfully'),
  outputs: z.array(z.string()).default([]),
});

class ActionCompletionExecutor implements NodeExecutor {
  readonly nodeType = 'action:completion';
  private readonly expr = new ExpressionEngine();

  async execute({ node, context }: NodeExecutorInput): Promise<NodeExecutorOutput> {
    const rawConfig = this.expr.resolveConfig(node.config ?? {}, context);
    const config = CompletionConfigSchema.parse(rawConfig);

    const summary = this.expr.resolveString(config.summary, context);

    const collectedOutputs: Record<string, unknown> = {};
    for (const nodeId of config.outputs) {
      collectedOutputs[nodeId] = context.nodeOutputs[nodeId] ?? null;
    }

    return {
      data: {
        summary,
        completedAt: new Date().toISOString(),
        executionId: context.executionId,
        outputs: collectedOutputs,
      },
      message: summary,
    };
  }
}

export const actionCompletionExecutor = new ActionCompletionExecutor();
