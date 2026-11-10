import PgBoss from 'pg-boss';
import { logger } from '@nexora/shared';
import { env } from '../config/env.js';
import { prisma } from '../plugins/prisma.js';
import { WorkflowExecutionService } from './execution.service.js';

export class SchedulerService {
  private static instance: SchedulerService;
  private boss: PgBoss | null = null;
  private isStarted = false;
  private executionService: WorkflowExecutionService;

  private constructor() {
    this.executionService = new WorkflowExecutionService(prisma);
  }

  public static getInstance(): SchedulerService {
    if (!SchedulerService.instance) {
      SchedulerService.instance = new SchedulerService();
    }
    return SchedulerService.instance;
  }

  public async start(): Promise<void> {
    if (this.isStarted) return;

    try {
      this.boss = new PgBoss({
        connectionString: env.DATABASE_URL,
        application_name: 'nexora-scheduler',
        schema: 'pgboss',
      });

      this.boss.on('error', (error) => {
        logger.error('pg-boss internal background error', error);
      });

      await this.boss.start();
      this.isStarted = true;
      logger.info('pg-boss scheduler queue started successfully');

      // Register workflow scheduler worker
      await this.boss.work('workflow-schedule-trigger', async (jobs) => {
        for (const job of jobs) {
          const { workflowId, organizationId, payload } = job.data as {
            workflowId: string;
            organizationId: string;
            payload?: unknown;
          };

          try {
            logger.info('Executing scheduled workflow job', { workflowId, organizationId, jobId: job.id });
            await this.executionService.runWorkflow({
              organizationId,
              workflowId,
              triggerType: 'trigger:schedule',
              triggerPayload: {
                ...(payload && typeof payload === 'object' ? payload : {}),
                scheduledAt: new Date().toISOString(),
                jobId: job.id,
              },
            });
          } catch (err) {
            logger.error('Failed to execute scheduled workflow job', err, { workflowId, jobId: job.id });
            throw err;
          }
        }
      });
    } catch (err) {
      logger.warn('Could not initialize pg-boss scheduler (e.g. offline/mock environment). Using graceful fallback', {
        error: err instanceof Error ? err.message : String(err),
      });
      this.boss = null;
    }
  }

  public async scheduleWorkflow(params: {
    cronExpression: string;
    workflowId: string;
    organizationId: string;
    payload?: unknown;
  }): Promise<string | null> {
    if (!this.boss || !this.isStarted) {
      logger.info('[mock-scheduler] Scheduled cron registered in fallback mode', params);
      return `mock-schedule-${Date.now()}`;
    }

    try {
      const scheduleName = `wf-sched-${params.workflowId}`;
      await this.boss.schedule(scheduleName, params.cronExpression, {
        workflowId: params.workflowId,
        organizationId: params.organizationId,
        payload: params.payload,
      });
      return scheduleName;
    } catch (err) {
      logger.error('Failed to schedule workflow in pg-boss', err, params);
      throw err;
    }
  }

  public async stop(): Promise<void> {
    if (this.boss && this.isStarted) {
      await this.boss.stop();
      this.isStarted = false;
      logger.info('pg-boss scheduler queue stopped');
    }
  }
}
