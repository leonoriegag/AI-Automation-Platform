/**
 * action:email — send email via mock provider
 */

import { z } from 'zod';
import { logger } from '@nexora/shared';
import type { NodeExecutor, NodeExecutorInput, NodeExecutorOutput } from '../types.js';
import { ExpressionEngine } from '../expression-engine.js';

const EmailConfigSchema = z.object({
  to: z.string().min(1),
  subject: z.string().min(1),
  body: z.string(),
  from: z.string().default('noreply@nexora.local'),
});

class ActionEmailExecutor implements NodeExecutor {
  readonly nodeType = 'action:email';
  private readonly expr = new ExpressionEngine();

  async execute({ node, context }: NodeExecutorInput): Promise<NodeExecutorOutput> {
    const rawConfig = this.expr.resolveConfig(node.config ?? {}, context);
    const config = EmailConfigSchema.parse(rawConfig);

    const messageId = `mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    logger.info('[mock-email] Email sent', {
      to: config.to,
      from: config.from,
      subject: config.subject,
      messageId,
      executionId: context.executionId,
    });

    return {
      data: {
        messageId,
        to: config.to,
        from: config.from,
        subject: config.subject,
        provider: 'mock',
        sentAt: new Date().toISOString(),
      },
      message: `Email sent to ${config.to}: "${config.subject}"`,
    };
  }
}

export const actionEmailExecutor = new ActionEmailExecutor();
