import { z } from 'zod';
import { logger } from '@nexora/shared';
import { validateSafeUrl } from './http.connector.js';
import type { ConnectorDefinition, ConnectorOperation, ExecutionContext } from '../types.js';

const SlackPostMessageInputSchema = z.object({
  webhookUrl: z.string().optional(),
  channel: z.string().optional(),
  text: z.string().min(1),
  blocks: z.array(z.record(z.unknown())).optional(),
});

export type SlackPostMessageInput = z.infer<typeof SlackPostMessageInputSchema>;

const SlackPostMessageOutputSchema = z.object({
  success: z.boolean(),
  mode: z.enum(['LIVE_WEBHOOK', 'MOCK_RECORDED']),
  timestamp: z.string(),
  text: z.string(),
  channel: z.string().optional(),
});

export type SlackPostMessageOutput = z.infer<typeof SlackPostMessageOutputSchema>;

export const slackPostMessageOperation: ConnectorOperation<Record<string, unknown>, SlackPostMessageInput, SlackPostMessageOutput> = {
  id: 'postMessage',
  name: 'Post Slack Message',
  description: 'Sends alerts to Slack channels via incoming webhook or logs deterministically for testing',
  inputSchema: SlackPostMessageInputSchema,
  outputSchema: SlackPostMessageOutputSchema,
  isIdempotent: false,
  async execute(context: ExecutionContext, _config: Record<string, unknown>, input: SlackPostMessageInput): Promise<SlackPostMessageOutput> {
    const webhook = input.webhookUrl || context.credentials?.['webhookUrl'];
    const now = new Date().toISOString();

    if (webhook) {
      const validatedUrl = validateSafeUrl(webhook);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      try {
        const response = await fetch(validatedUrl.toString(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: input.text,
            blocks: input.blocks,
            channel: input.channel,
          }),
          signal: controller.signal,
        });

        return {
          success: response.ok,
          mode: 'LIVE_WEBHOOK',
          timestamp: now,
          text: input.text,
          channel: input.channel,
        };
      } finally {
        clearTimeout(timeout);
      }
    }

    logger.info('[mock-slack] Message recorded offline', {
      channel: input.channel || '#general',
      text: input.text,
      executionId: context.executionId,
      orgId: context.organizationId,
    });

    return {
      success: true,
      mode: 'MOCK_RECORDED',
      timestamp: now,
      text: input.text,
      channel: input.channel || '#general',
    };
  },
};

export const slackConnector: ConnectorDefinition = {
  id: 'slack',
  name: 'Slack Alerts',
  category: 'messaging',
  description: 'Team notifications and incident dispatch for Slack',
  credentialType: 'NONE',
  operations: new Map([
    [slackPostMessageOperation.id, slackPostMessageOperation as ConnectorOperation],
  ]),
};
