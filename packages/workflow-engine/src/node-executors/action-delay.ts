/**
 * action:delay — timed pause node (max 60s inline)
 */

import { z } from 'zod';
import type { NodeExecutor, NodeExecutorInput, NodeExecutorOutput } from '../types.js';
import { ExpressionEngine } from '../expression-engine.js';

const MAX_INLINE_DELAY_MS = 60_000;

const DelayConfigSchema = z.object({
  durationMs: z.coerce.number().int().nonnegative().max(MAX_INLINE_DELAY_MS),
});

class ActionDelayExecutor implements NodeExecutor {
  readonly nodeType = 'action:delay';
  private readonly expr = new ExpressionEngine();

  async execute({ node, context }: NodeExecutorInput): Promise<NodeExecutorOutput> {
    const rawConfig = this.expr.resolveConfig(node.config ?? {}, context);
    const { durationMs } = DelayConfigSchema.parse(rawConfig);

    await new Promise<void>((resolve) => setTimeout(resolve, durationMs));

    return { data: { delayedMs: durationMs }, message: `Delayed ${durationMs}ms` };
  }
}

export const actionDelayExecutor = new ActionDelayExecutor();
