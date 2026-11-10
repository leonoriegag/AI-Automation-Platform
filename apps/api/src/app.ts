import fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { env } from './config/env.js';
import { AppError } from '@nexora/shared';
import { healthRoutes } from './routes/health.routes.js';
import { authRoutes } from './routes/auth.routes.js';
import { organizationRoutes } from './routes/organization.routes.js';
import { workflowRoutes } from './routes/workflow.routes.js';
import { credentialRoutes } from './routes/credential.routes.js';
import { connectorRoutes } from './routes/connector.routes.js';

export function buildApp(): FastifyInstance {
  const app = fastify({
    logger: false, // We use structured logger or Fastify internal
    disableRequestLogging: true
  });

  // CORS
  app.register(cors, {
    origin: true,
    credentials: true
  });

  // JWT
  app.register(jwt, {
    secret: env.JWT_SECRET
  });

  // Global Error Handler
  app.setErrorHandler((error: any, request, reply) => {
    if (error instanceof AppError) {
      reply.status(error.statusCode).send({
        error: {
          code: error.code,
          message: error.message,
          details: error.details
        }
      });
      return;
    }

    if (error && typeof error === 'object' && 'validation' in error) {
      reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request schema validation failed',
          details: error.validation
        }
      });
      return;
    }

    console.error('Unhandled internal server error:', error);
    reply.status(500).send({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected internal error occurred'
      }
    });
  });

  // Register Routes
  app.register(healthRoutes);
  app.register(authRoutes);
  app.register(organizationRoutes);
  app.register(workflowRoutes);
  app.register(credentialRoutes);
  app.register(connectorRoutes);

  return app;
}
