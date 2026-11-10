import { z } from 'zod';
import { CredentialType } from '@nexora/domain';

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
  inputSchema: z.ZodSchema<TInput>;
  outputSchema: z.ZodSchema<TOutput>;
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

export class ConnectorRegistry {
  private static instance: ConnectorRegistry;
  private connectors = new Map<string, ConnectorDefinition>();

  public static getInstance(): ConnectorRegistry {
    if (!ConnectorRegistry.instance) {
      ConnectorRegistry.instance = new ConnectorRegistry();
    }
    return ConnectorRegistry.instance;
  }

  public register(connector: ConnectorDefinition): void {
    if (this.connectors.has(connector.id)) {
      throw new Error(`Connector with ID '${connector.id}' is already registered`);
    }
    this.connectors.set(connector.id, connector);
  }

  public get(id: string): ConnectorDefinition | undefined {
    return this.connectors.get(id);
  }

  public getAll(): ConnectorDefinition[] {
    return Array.from(this.connectors.values());
  }

  public getOperation(connectorId: string, operationId: string): ConnectorOperation | undefined {
    const connector = this.get(connectorId);
    if (!connector) return undefined;
    return connector.operations.get(operationId);
  }

  public clear(): void {
    this.connectors.clear();
  }
}
