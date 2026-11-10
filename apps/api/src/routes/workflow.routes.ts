import { FastifyInstance } from 'fastify';
import { prisma } from '../plugins/prisma.js';
import { WorkflowRepository } from '../repositories/workflow.repository.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { CreateWorkflowInputSchema, UpdateWorkflowInputSchema } from '@nexora/domain';
import { ValidationError } from '@nexora/shared';

export async function workflowRoutes(app: FastifyInstance) {
  const repo = new WorkflowRepository(prisma);

  app.get(
    '/api/v1/workflows',
    { preHandler: [authenticate, requirePermission('workflow:read')] },
    async (request) => {
      const query = request.query as { status?: string; limit?: string; offset?: string };
      return repo.list(request.organizationId, {
        status: query.status,
        limit: query.limit ? parseInt(query.limit, 10) : 50,
        offset: query.offset ? parseInt(query.offset, 10) : 0
      });
    }
  );

  app.post(
    '/api/v1/workflows',
    { preHandler: [authenticate, requirePermission('workflow:write')] },
    async (request, reply) => {
      const parseResult = CreateWorkflowInputSchema.safeParse(request.body);
      if (!parseResult.success) {
        throw new ValidationError('Invalid workflow creation payload', parseResult.error.format());
      }

      const created = await repo.create(request.organizationId, parseResult.data);
      reply.status(201);
      return created;
    }
  );

  app.get(
    '/api/v1/workflows/:id',
    { preHandler: [authenticate, requirePermission('workflow:read')] },
    async (request) => {
      const { id } = request.params as { id: string };
      return repo.findById(request.organizationId, id);
    }
  );

  app.put(
    '/api/v1/workflows/:id',
    { preHandler: [authenticate, requirePermission('workflow:write')] },
    async (request) => {
      const { id } = request.params as { id: string };
      const parseResult = UpdateWorkflowInputSchema.safeParse(request.body);
      if (!parseResult.success) {
        throw new ValidationError('Invalid workflow update payload', parseResult.error.format());
      }

      return repo.update(request.organizationId, id, parseResult.data);
    }
  );

  app.delete(
    '/api/v1/workflows/:id',
    { preHandler: [authenticate, requirePermission('workflow:delete')] },
    async (request) => {
      const { id } = request.params as { id: string };
      return repo.delete(request.organizationId, id);
    }
  );
}
