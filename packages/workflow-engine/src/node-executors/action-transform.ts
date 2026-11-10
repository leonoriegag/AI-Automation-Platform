/**
 * action:transform — data transformation node
 */

import { z } from 'zod';
import type { NodeExecutor, NodeExecutorInput, NodeExecutorOutput } from '../types.js';
import { ExpressionEngine } from '../expression-engine.js';

const TransformConfigSchema = z.object({
  mapping: z.record(z.string()),
});

class ActionTransformExecutor implements NodeExecutor {
  readonly nodeType = 'action:transform';
  private readonly expr = new ExpressionEngine();

  async execute({ node, context }: NodeExecutorInput): Promise<NodeExecutorOutput> {
    const rawConfig = this.expr.resolveConfig(node.config ?? {}, context);
    const config = TransformConfigSchema.parse(rawConfig);

    const output: Record<string, unknown> = {};
    for (const [key, template] of Object.entries(config.mapping)) {
      output[key] = this.expr.resolveString(template, context);
    }

    return { data: output, message: `Transformed ${Object.keys(output).length} field(s)` };
  }
}

export const actionTransformExecutor = new ActionTransformExecutor();
