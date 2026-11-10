import { FastifyRequest, FastifyReply } from 'fastify';
import { Role } from '@nexora/domain';
import { UnauthorizedError } from '@nexora/shared';

export interface AuthenticatedUser {
  id: string;
  organizationId: string;
  email: string;
  name: string;
  role: Role;
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: AuthenticatedUser;
    user: AuthenticatedUser;
  }
}

declare module 'fastify' {
  interface FastifyRequest {
    authUser: AuthenticatedUser;
    organizationId: string;
  }
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or malformed Authorization header');
    }

    const decoded = await request.jwtVerify<AuthenticatedUser>();
    request.authUser = decoded;
    request.organizationId = decoded.organizationId;
  } catch (err) {
    throw new UnauthorizedError('Invalid or expired authentication token');
  }
}
