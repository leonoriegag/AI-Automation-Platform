import { z } from 'zod';

export const CredentialTypeEnum = z.enum([
  'BEARER_TOKEN',
  'API_KEY',
  'OAUTH2',
  'BASIC_AUTH',
  'WEBHOOK_SECRET'
]);

export type CredentialType = z.infer<typeof CredentialTypeEnum>;

export const CredentialMetadataSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  name: z.string().min(2).max(100),
  type: CredentialTypeEnum,
  maskedHint: z.string(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export type CredentialMetadata = z.infer<typeof CredentialMetadataSchema>;

export const CreateCredentialInputSchema = z.object({
  name: z.string().min(2).max(100),
  type: CredentialTypeEnum,
  secret: z.string().min(1, 'Secret value is required')
});

export type CreateCredentialInput = z.infer<typeof CreateCredentialInputSchema>;
