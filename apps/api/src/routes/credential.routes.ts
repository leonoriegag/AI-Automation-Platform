import { FastifyInstance } from 'fastify';
import { prisma } from '../plugins/prisma.js';
import { CredentialRepository } from '../repositories/credential.repository.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { CreateCredentialInputSchema } from '@nexora/domain';
import { ValidationError } from '@nexora/shared';

export async function credentialRoutes(app: FastifyInstance) {
  const repo = new CredentialRepository(prisma);

  app.get(
    '/api/v1/credentials',
    { preHandler: [authenticate, requirePermission('credential:read')] },
    async (request) => {
      return repo.list(request.organizationId);
    }
  );

  app.post(
    '/api/v1/credentials',
    { preHandler: [authenticate, requirePermission('credential:write')] },
    async (request, reply) => {
      const parseResult = CreateCredentialInputSchema.safeParse(request.body);
      if (!parseResult.success) {
        throw new ValidationError('Invalid credential creation payload', parseResult.error.format());
      }

      const created = await repo.create(request.organizationId, parseResult.data);
      reply.status(201);
      return created;
    }
  );

  app.get(
    '/api/v1/credentials/:id',
    { preHandler: [authenticate, requirePermission('credential:read')] },
    async (request) => {
      const { id } = request.params as { id: string };
      return repo.findById(request.organizationId, id);
    }
  );

  app.delete(
    '/api/v1/credentials/:id',
    { preHandler: [authenticate, requirePermission('credential:delete')] },
    async (request) => {
      const { id } = request.params as { id: string };
      return repo.delete(request.organizationId, id);
    }
  );
}
