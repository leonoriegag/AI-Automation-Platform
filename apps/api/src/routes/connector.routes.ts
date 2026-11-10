import { FastifyInstance } from 'fastify';
import { ConnectorRegistry } from '@nexora/connectors';
import { authenticate } from '../middleware/auth.js';

export async function connectorRoutes(app: FastifyInstance) {
  const registry = ConnectorRegistry.getInstance();

  app.get(
    '/api/v1/connectors',
    { preHandler: [authenticate] },
    async () => {
      const connectors = registry.list();
      return connectors.map((c) => ({
        id: c.id,
        name: c.name,
        category: c.category,
        description: c.description,
        credentialType: c.credentialType,
        operations: Array.from(c.operations.values()).map((op) => ({
          id: op.id,
          name: op.name,
          description: op.description,
          isIdempotent: op.isIdempotent,
        })),
      }));
    }
  );
}
