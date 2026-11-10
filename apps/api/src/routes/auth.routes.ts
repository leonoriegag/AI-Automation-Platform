import { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { prisma } from '../plugins/prisma.js';
import { LoginInputSchema, RegisterUserInputSchema, ROLE_PERMISSIONS } from '@nexora/domain';
import { UnauthorizedError, ConflictError, ValidationError } from '@nexora/shared';
import { authenticate } from '../middleware/auth.js';

export async function authRoutes(app: FastifyInstance) {
  app.post('/api/v1/auth/login', async (request, reply) => {
    const parseResult = LoginInputSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw new ValidationError('Invalid login payload', parseResult.error.format());
    }

    const { email, password } = parseResult.data;

    const user = await prisma.user.findFirst({
      where: { email: email.toLowerCase(), isActive: true },
      include: { organization: true }
    });

    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const tokenPayload = {
      id: user.id,
      organizationId: user.organizationId,
      email: user.email,
      name: user.name,
      role: user.role
    };

    const token = app.jwt.sign(tokenPayload, { expiresIn: '24h' });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organization: {
          id: user.organization.id,
          name: user.organization.name,
          slug: user.organization.slug
        },
        permissions: ROLE_PERMISSIONS[user.role as keyof typeof ROLE_PERMISSIONS] || []
      }
    };
  });

  app.post('/api/v1/auth/register', async (request, reply) => {
    const parseResult = RegisterUserInputSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw new ValidationError('Invalid registration payload', parseResult.error.format());
    }

    const { organizationId, email, password, name, role } = parseResult.data;

    const existing = await prisma.user.findUnique({
      where: {
        organizationId_email: {
          organizationId,
          email: email.toLowerCase()
        }
      }
    });

    if (existing) {
      throw new ConflictError(`User with email '${email}' already exists in this organization`);
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        organizationId,
        email: email.toLowerCase(),
        passwordHash,
        name,
        role: role as any
      },
      include: { organization: true }
    });

    reply.status(201);
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId: user.organizationId
    };
  });

  app.get('/api/v1/auth/me', { preHandler: [authenticate] }, async (request) => {
    const user = await prisma.user.findUnique({
      where: { id: request.authUser.id },
      include: { organization: true }
    });

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organization: {
        id: user.organization.id,
        name: user.organization.name,
        slug: user.organization.slug
      },
      permissions: ROLE_PERMISSIONS[user.role as keyof typeof ROLE_PERMISSIONS] || []
    };
  });
}
