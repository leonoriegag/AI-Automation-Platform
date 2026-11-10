import { PrismaClient, ExecutionStatus, StepStatus } from '@prisma/client';
import { NotFoundError } from '@nexora/shared';

export class ExecutionRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(organizationId: string, id: string) {
    const execution = await this.prisma.execution.findFirst({
      where: { id, organizationId },
      include: {
        stepExecutions: {
          orderBy: { createdAt: 'asc' }
        },
        approvalRequests: true
      }
    });

    if (!execution) {
      throw new NotFoundError(`Execution with ID '${id}' not found`);
    }

    return execution;
  }

  async list(organizationId: string, options: { workflowId?: string; status?: ExecutionStatus; limit?: number; offset?: number } = {}) {
    const where: any = { organizationId };
    if (options.workflowId) where.workflowId = options.workflowId;
    if (options.status) where.status = options.status;

    const [total, items] = await Promise.all([
      this.prisma.execution.count({ where }),
      this.prisma.execution.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options.limit ?? 50,
        skip: options.offset ?? 0,
        include: {
          workflow: {
            select: { name: true }
          }
        }
      })
    ]);

    return { total, items };
  }

  async create(data: {
    organizationId: string;
    workflowId: string;
    workflowVersion: number;
    triggerType: string;
    triggerPayload?: any;
    context?: any;
  }) {
    return this.prisma.execution.create({
      data: {
        organizationId: data.organizationId,
        workflowId: data.workflowId,
        workflowVersion: data.workflowVersion,
        triggerType: data.triggerType,
        triggerPayload: data.triggerPayload ?? {},
        context: data.context ?? {},
        status: ExecutionStatus.PENDING
      }
    });
  }

  async updateStatus(id: string, status: ExecutionStatus, data: { error?: string; currentNodeId?: string; context?: any } = {}) {
    const updateData: any = {
      status,
      error: data.error,
      currentNodeId: data.currentNodeId,
      updatedAt: new Date()
    };

    if (data.context) {
      updateData.context = data.context;
    }

    if (status === ExecutionStatus.RUNNING) {
      updateData.startedAt = new Date();
    } else if (status === ExecutionStatus.COMPLETED || status === ExecutionStatus.FAILED || status === ExecutionStatus.CANCELLED) {
      updateData.completedAt = new Date();
    }

    return this.prisma.execution.update({
      where: { id },
      data: updateData
    });
  }

  async createStepExecution(data: {
    executionId: string;
    nodeId: string;
    nodeType: string;
    status: StepStatus;
    input?: any;
  }) {
    return this.prisma.stepExecution.create({
      data: {
        executionId: data.executionId,
        nodeId: data.nodeId,
        nodeType: data.nodeType,
        status: data.status,
        input: data.input ?? {},
        startedAt: new Date()
      }
    });
  }

  async completeStepExecution(id: string, data: {
    status: StepStatus;
    output?: any;
    error?: string;
    durationMs?: number;
  }) {
    return this.prisma.stepExecution.update({
      where: { id },
      data: {
        status: data.status,
        output: data.output ?? {},
        error: data.error,
        durationMs: data.durationMs,
        completedAt: new Date()
      }
    });
  }
}
