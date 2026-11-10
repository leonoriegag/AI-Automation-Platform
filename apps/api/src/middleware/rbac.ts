import { FastifyRequest, FastifyReply } from 'fastify';
import { Permission, hasPermission } from '@nexora/domain';
import { ForbiddenError } from '@nexora/shared';

export function requirePermission(permission: Permission) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.authUser) {
      throw new ForbiddenError('User not authenticated');
    }

    const allowed = hasPermission(request.authUser.role, permission);
    if (!allowed) {
      throw new ForbiddenError(`Insufficient permissions: '${permission}' required`);
    }
  };
}
