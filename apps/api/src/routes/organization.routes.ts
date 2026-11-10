import { FastifyInstance } from 'fastify';
import { prisma } from '../plugins/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { NotFoundError } from '@nexora/shared';

export async function organizationRoutes(app: FastifyInstance) {
  app.get('/api/v1/organizations/current', { preHandler: [authenticate] }, async (request) => {
    const org = await prisma.organization.findUnique({
      where: { id: request.organizationId },
      include: {
        _count: {
          select: {
            users: true,
            workflows: true,
            credentials: true,
            executions: true
          }
        }
      }
    });

    if (!org) {
      throw new NotFoundError('Organization not found');
    }

    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      stats: {
        totalUsers: org._count.users,
        totalWorkflows: org._count.workflows,
        totalCredentials: org._count.credentials,
        totalExecutions: org._count.executions
      },
      createdAt: org.createdAt
    };
  });
}
