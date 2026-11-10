import { buildApp } from './app.js';
import { env } from './config/env.js';
import { logger } from '@nexora/shared';
import { prisma } from './plugins/prisma.js';

async function start() {
  const app = buildApp();

  try {
    // Check DB connection
    await prisma.$connect();
    logger.info('Connected to PostgreSQL database');

    const address = await app.listen({
      port: env.PORT,
      host: env.HOST
    });

    logger.info(`NEXORA Automation API server running at ${address}`);
  } catch (err) {
    logger.error('Failed to start server', err);
    process.exit(1);
  }
}

// Handle shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

start();
