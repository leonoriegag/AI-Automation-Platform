export * from './types.js';

// Provider exports
export * from './providers/http.connector.js';
export * from './providers/webhook.connector.js';
export * from './providers/email.connector.js';
export * from './providers/slack.connector.js';
export * from './providers/crm.connector.js';

import type { ConnectorDefinition } from './types.js';
import { httpConnector } from './providers/http.connector.js';
import { webhookConnector } from './providers/webhook.connector.js';
import { emailConnector } from './providers/email.connector.js';
import { slackConnector } from './providers/slack.connector.js';
import { crmConnector } from './providers/crm.connector.js';

export class ConnectorRegistry {
  private static instance: ConnectorRegistry;
  private connectors = new Map<string, ConnectorDefinition>();

  public static getInstance(): ConnectorRegistry {
    if (!ConnectorRegistry.instance) {
      ConnectorRegistry.instance = new ConnectorRegistry();
      ConnectorRegistry.instance.registerDefaults();
    }
    return ConnectorRegistry.instance;
  }

  public registerDefaults(): void {
    const defaults = [httpConnector, webhookConnector, emailConnector, slackConnector, crmConnector];
    for (const c of defaults) {
      if (!this.connectors.has(c.id)) {
        this.connectors.set(c.id, c);
      }
    }
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

  public getOperation(connectorId: string, operationId: string) {
    const connector = this.connectors.get(connectorId);
    return connector?.operations.get(operationId);
  }

  public list(): ConnectorDefinition[] {
    return Array.from(this.connectors.values());
  }

  public clear(): void {
    this.connectors.clear();
  }
}
