import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import { ConnectorRegistry, ConnectorDefinition } from '@nexora/connectors';

describe('Connector Registry Architecture', () => {
  let registry: ConnectorRegistry;

  beforeEach(() => {
    registry = ConnectorRegistry.getInstance();
    registry.clear();
  });

  it('should register and retrieve a connector definition', () => {
    const mockConnector: ConnectorDefinition = {
      id: 'mock_crm',
      name: 'Mock CRM Connector',
      category: 'crm',
      description: 'Test CRM connector',
      credentialType: 'API_KEY',
      operations: new Map([
        [
          'createLead',
          {
            id: 'createLead',
            name: 'Create Lead',
            description: 'Creates a sales lead',
            inputSchema: z.object({ title: z.string(), score: z.number() }),
            outputSchema: z.object({ id: z.string() }),
            isIdempotent: false,
            execute: async (_, __, input) => ({ id: 'lead_123' })
          }
        ]
      ])
    };

    registry.register(mockConnector);

    const retrieved = registry.get('mock_crm');
    expect(retrieved).toBeDefined();
    expect(retrieved?.name).toBe('Mock CRM Connector');

    const op = registry.getOperation('mock_crm', 'createLead');
    expect(op).toBeDefined();
    expect(op?.isIdempotent).toBe(false);
  });

  it('should prevent duplicate connector IDs', () => {
    const c1: ConnectorDefinition = {
      id: 'dup_id',
      name: 'First',
      category: 'api',
      description: '',
      operations: new Map()
    };
    const c2: ConnectorDefinition = {
      id: 'dup_id',
      name: 'Second',
      category: 'api',
      description: '',
      operations: new Map()
    };

    registry.register(c1);
    expect(() => registry.register(c2)).toThrow(/already registered/);
  });
});
