import { FastifyInstance } from 'fastify';
import { prisma } from '../plugins/prisma.js';

export async function healthRoutes(app: FastifyInstance) {
  app.get('/health', async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ok',
        database: 'connected',
        timestamp: new Date().toISOString()
      };
    } catch (err: any) {
      return {
        status: 'degraded',
        database: 'disconnected',
        error: err.message,
        timestamp: new Date().toISOString()
      };
    }
  });
}
