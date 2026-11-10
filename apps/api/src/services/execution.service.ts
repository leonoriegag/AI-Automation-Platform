import type { PrismaClient } from '@prisma/client';
import { ExecutionStatus, StepStatus } from '@prisma/client';
import {
  DagExecutor,
  createDefaultRegistry,
  type ExecutionContext as EngineExecutionContext,
} from '@nexora/workflow-engine';
import { ExecutionRepository } from '../repositories/execution.repository.js';
import { CredentialRepository } from '../repositories/credential.repository.js';
import type { WorkflowGraph } from '@nexora/domain';

export class WorkflowExecutionService {
  private executionRepo: ExecutionRepository;
  private credentialRepo: CredentialRepository;
  private dagExecutor: DagExecutor;

  constructor(private prisma: PrismaClient) {
    this.executionRepo = new ExecutionRepository(prisma);
    this.credentialRepo = new CredentialRepository(prisma);
    const registry = createDefaultRegistry();
    this.dagExecutor = new DagExecutor(registry);
  }

  async runWorkflow(params: {
    organizationId: string;
    workflowId: string;
    triggerType: string;
    triggerPayload?: unknown;
    budgetMs?: number;
  }) {
    const workflow = await this.prisma.workflow.findFirst({
      where: { id: params.workflowId, organizationId: params.organizationId },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    });

    if (!workflow) {
      throw new Error(`Workflow with ID '${params.workflowId}' not found in organization.`);
    }

    const latestVersion = workflow.versions[0];
    if (!latestVersion) {
      throw new Error(`Workflow '${workflow.name}' has no active version graphs.`);
    }

    const graph = latestVersion.graph as unknown as WorkflowGraph;

    // 1. Create execution record
    const execution = await this.executionRepo.create({
      organizationId: params.organizationId,
      workflowId: workflow.id,
      workflowVersion: latestVersion.version,
      triggerType: params.triggerType,
      triggerPayload: params.triggerPayload ?? {},
      context: {
        workflowName: workflow.name,
      },
    });

    await this.executionRepo.updateStatus(execution.id, ExecutionStatus.RUNNING);

    // 2. Prepare Engine Execution Context
    const engineCtx: EngineExecutionContext = {
      workflow: graph,
      executionId: execution.id,
      organizationId: params.organizationId,
      nodeOutputs: {},
      triggerPayload: params.triggerPayload ?? {},
      startedAt: new Date(),
      budgetMs: params.budgetMs ?? 30000,
    };

    // 3. Execute DAG
    try {
      const result = await this.dagExecutor.execute(graph, engineCtx);

      // 4. Record individual step executions
      for (const step of result.steps) {
        const stepRecord = await this.executionRepo.createStepExecution({
          executionId: execution.id,
          nodeId: step.nodeId,
          nodeType: step.nodeType,
          status: step.status === 'COMPLETED' ? StepStatus.COMPLETED : step.status === 'FAILED' ? StepStatus.FAILED : StepStatus.SKIPPED,
        });

        await this.executionRepo.completeStepExecution(stepRecord.id, {
          status: step.status === 'COMPLETED' ? StepStatus.COMPLETED : step.status === 'FAILED' ? StepStatus.FAILED : StepStatus.SKIPPED,
          output: step.output?.data,
          error: step.error,
          durationMs: step.durationMs,
        });
      }

      // 5. Update final execution status
      const finalStatus = result.status === 'COMPLETED' ? ExecutionStatus.COMPLETED : ExecutionStatus.FAILED;
      await this.executionRepo.updateStatus(execution.id, finalStatus, {
        error: result.error,
        context: {
          outputs: engineCtx.nodeOutputs,
          finalOutput: result.finalOutput,
        },
      });

      return {
        executionId: execution.id,
        status: finalStatus,
        durationMs: result.durationMs,
        steps: result.steps,
        finalOutput: result.finalOutput,
      };
    } catch (err: any) {
      await this.executionRepo.updateStatus(execution.id, ExecutionStatus.FAILED, {
        error: err.message,
      });
      throw err;
    }
  }
}
