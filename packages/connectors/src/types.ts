import { z } from 'zod';
import type { CredentialType } from '@nexora/domain';

export interface ExecutionContext {
  organizationId: string;
  executionId: string;
  nodeId: string;
  credentials?: Record<string, string>;
}

export interface ConnectorOperation<TConfig = any, TInput = any, TOutput = any> {
  id: string;
  name: string;
  description: string;
  inputSchema: z.ZodType<TInput, any, any>;
  outputSchema: z.ZodType<TOutput, any, any>;
  isIdempotent: boolean;
  execute(context: ExecutionContext, config: TConfig, input: TInput): Promise<TOutput>;
}

export interface ConnectorDefinition {
  id: string;
  name: string;
  category: 'api' | 'messaging' | 'crm' | 'ai' | 'storage';
  description: string;
  credentialType?: CredentialType | 'NONE';
  operations: Map<string, ConnectorOperation>;
}
