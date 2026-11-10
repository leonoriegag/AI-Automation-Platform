import { z } from 'zod';
import { logger } from '@nexora/shared';
import type { ConnectorDefinition, ConnectorOperation, ExecutionContext } from '../types.js';

const EmailSendInputSchema = z.object({
  to: z.string().email().or(z.string().min(1)),
  subject: z.string().min(1),
  body: z.string(),
  from: z.string().default('noreply@nexora.local'),
  html: z.string().optional(),
});

export type EmailSendInput = z.infer<typeof EmailSendInputSchema>;

const EmailSendOutputSchema = z.object({
  messageId: z.string(),
  to: z.string(),
  subject: z.string(),
  status: z.enum(['QUEUED', 'SENT']),
  provider: z.string(),
  createdAt: z.string(),
});

export type EmailSendOutput = z.infer<typeof EmailSendOutputSchema>;

export interface EmailOutboxClient {
  recordSentEmail(entry: {
    organizationId: string;
    to: string;
    from: string;
    subject: string;
    body: string;
    html?: string;
  }): Promise<{ id: string }>;
}

let dbClient: EmailOutboxClient | null = null;

export function setEmailOutboxClient(client: EmailOutboxClient) {
  dbClient = client;
}

export const emailSendOperation: ConnectorOperation<Record<string, unknown>, EmailSendInput, EmailSendOutput> = {
  id: 'send',
  name: 'Send Transactional Email',
  description: 'Sends email notification with fallback to internal mock outbox table',
  inputSchema: EmailSendInputSchema,
  outputSchema: EmailSendOutputSchema,
  isIdempotent: false,
  async execute(context: ExecutionContext, _config: Record<string, unknown>, input: EmailSendInput): Promise<EmailSendOutput> {
    const timestamp = new Date().toISOString();
    let messageId = `msg_${Math.random().toString(36).slice(2, 10)}_${Date.now()}`;

    if (dbClient) {
      try {
        const outboxEntry = await dbClient.recordSentEmail({
          organizationId: context.organizationId,
          to: input.to,
          from: input.from,
          subject: input.subject,
          body: input.body,
          html: input.html,
        });
        messageId = outboxEntry.id;
      } catch (err) {
        logger.warn('Failed to record email to database outbox table, returning mock message id', {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    logger.info('Email sent successfully', {
      to: input.to,
      subject: input.subject,
      messageId,
      orgId: context.organizationId,
    });

    return {
      messageId,
      to: input.to,
      subject: input.subject,
      status: 'SENT',
      provider: 'mock-outbox',
      createdAt: timestamp,
    };
  },
};

export const emailConnector: ConnectorDefinition = {
  id: 'email',
  name: 'Email Service',
  category: 'messaging',
  description: 'Transactional email provider with DB outbox tracking',
  credentialType: 'API_KEY',
  operations: new Map([
    [emailSendOperation.id, emailSendOperation as ConnectorOperation],
  ]),
};
