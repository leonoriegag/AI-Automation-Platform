import { z } from 'zod';
import { computeHmac } from '@nexora/shared';
import { validateSafeUrl } from './http.connector.js';
import type { ConnectorDefinition, ConnectorOperation, ExecutionContext } from '../types.js';

const WebhookSendInputSchema = z.object({
  url: z.string().min(1),
  payload: z.unknown(),
  signingSecret: z.string().optional(),
  customHeaders: z.record(z.string()).default({}),
  timeoutMs: z.number().int().positive().default(10000),
});

export type WebhookSendInput = z.infer<typeof WebhookSendInputSchema>;

const WebhookSendOutputSchema = z.object({
  delivered: z.boolean(),
  status: z.number(),
  timestamp: numberOrString(),
  signatureSent: z.string().optional(),
  responseBody: z.unknown().optional(),
});

function numberOrString() {
  return z.union([z.number(), z.string()]);
}

export type WebhookSendOutput = z.infer<typeof WebhookSendOutputSchema>;

export const webhookSendOperation: ConnectorOperation<Record<string, unknown>, WebhookSendInput, WebhookSendOutput> = {
  id: 'send',
  name: 'Send Outbound Webhook',
  description: 'Sends HMAC-signed event payloads to external URLs with replay prevention headers',
  inputSchema: WebhookSendInputSchema,
  outputSchema: WebhookSendOutputSchema,
  isIdempotent: false,
  async execute(context: ExecutionContext, _config: Record<string, unknown>, input: WebhookSendInput): Promise<WebhookSendOutput> {
    const targetUrl = validateSafeUrl(input.url);

    const timestamp = Math.floor(Date.now() / 1000);
    const bodyStr = JSON.stringify(input.payload);
    const headers = new Headers(input.customHeaders);

    headers.set('Content-Type', 'application/json');
    headers.set('X-Nexora-Timestamp', timestamp.toString());
    headers.set('X-Nexora-Delivery', context.executionId);

    const secret = input.signingSecret || context.credentials?.['webhookSecret'];
    let signature: string | undefined;

    if (secret) {
      // Signature canonical string: timestamp + "." + body
      const signPayload = `${timestamp}.${bodyStr}`;
      signature = computeHmac(signPayload, secret);
      headers.set('X-Nexora-Signature', `sha256=${signature}`);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), input.timeoutMs);

    try {
      const response = await fetch(targetUrl.toString(), {
        method: 'POST',
        headers,
        body: bodyStr,
        signal: controller.signal,
      });

      const responseText = await response.text();
      let parsedResponse: unknown = responseText;
      try {
        parsedResponse = JSON.parse(responseText);
      } catch {
        // keep text
      }

      return {
        delivered: response.ok,
        status: response.status,
        timestamp,
        signatureSent: signature,
        responseBody: parsedResponse,
      };
    } finally {
      clearTimeout(timeout);
    }
  },
};

export const webhookConnector: ConnectorDefinition = {
  id: 'webhook',
  name: 'Outbound Webhook',
  category: 'api',
  description: 'HMAC signed outbound webhook event dispatcher',
  credentialType: 'NONE',
  operations: new Map([
    [webhookSendOperation.id, webhookSendOperation as ConnectorOperation],
  ]),
};
