import fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { env } from './config/env.js';
import { AppError } from '@nexora/shared';
import { prisma } from './plugins/prisma.js';
import { initializeConnectorBridges } from './services/connector-bridges.js';

import { healthRoutes } from './routes/health.routes.js';
import { authRoutes } from './routes/auth.routes.js';
import { organizationRoutes } from './routes/organization.routes.js';
import { workflowRoutes } from './routes/workflow.routes.js';
import { credentialRoutes } from './routes/credential.routes.js';
import { connectorRoutes } from './routes/connector.routes.js';
import { webhookTriggerRoutes } from './routes/webhook-trigger.routes.js';

export function buildApp(): FastifyInstance {
  // Initialize in-memory and database bridges for connectors (CRM, mock Email outbox, etc)
  initializeConnectorBridges(prisma);

  const app = fastify({
    logger: false,
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
  app.register(webhookTriggerRoutes);

  return app;
}
