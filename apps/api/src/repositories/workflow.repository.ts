import { PrismaClient } from '@prisma/client';
import { CreateWorkflowInput, UpdateWorkflowInput, Workflow, WorkflowGraph } from '@nexora/domain';
import { NotFoundError } from '@nexora/shared';

export class WorkflowRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(organizationId: string, id: string) {
    const workflow = await this.prisma.workflow.findFirst({
      where: { id, organizationId },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 1
        }
      }
    });

    if (!workflow) {
      throw new NotFoundError(`Workflow with ID '${id}' not found`);
    }

    return {
      ...workflow,
      currentGraph: workflow.versions[0]?.graph as unknown as WorkflowGraph
    };
  }

  async list(organizationId: string, options: { status?: any; limit?: number; offset?: number } = {}) {
    const where: any = { organizationId };
    if (options.status) {
      where.status = options.status;
    }

    const [total, items] = await Promise.all([
      this.prisma.workflow.count({ where }),
      this.prisma.workflow.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        take: options.limit ?? 50,
        skip: options.offset ?? 0
      })
    ]);

    return { total, items };
  }

  async create(organizationId: string, input: CreateWorkflowInput) {
    return this.prisma.$transaction(async tx => {
      const workflow = await tx.workflow.create({
        data: {
          organizationId,
          name: input.name,
          description: input.description,
          currentVersion: 1
        }
      });

      const version = await tx.workflowVersion.create({
        data: {
          workflowId: workflow.id,
          version: 1,
          graph: input.graph as any,
          changelog: 'Initial version'
        }
      });

      return {
        ...workflow,
        currentGraph: version.graph as unknown as WorkflowGraph
      };
    });
  }

  async update(organizationId: string, id: string, input: UpdateWorkflowInput) {
    return this.prisma.$transaction(async tx => {
      const existing = await tx.workflow.findFirst({
        where: { id, organizationId }
      });

      if (!existing) {
        throw new NotFoundError(`Workflow with ID '${id}' not found`);
      }

      let newVersionNumber = existing.currentVersion;
      if (input.graph) {
        newVersionNumber += 1;
        await tx.workflowVersion.create({
          data: {
            workflowId: id,
            version: newVersionNumber,
            graph: input.graph as any,
            changelog: `Version update ${newVersionNumber}`
          }
        });
      }

      const updated = await tx.workflow.update({
        where: { id },
        data: {
          name: input.name ?? existing.name,
          description: input.description ?? existing.description,
          status: input.status ?? existing.status,
          currentVersion: newVersionNumber
        },
        include: {
          versions: {
            orderBy: { version: 'desc' },
            take: 1
          }
        }
      });

      return {
        ...updated,
        currentGraph: updated.versions[0]?.graph as unknown as WorkflowGraph
      };
    });
  }

  async delete(organizationId: string, id: string) {
    const existing = await this.prisma.workflow.findFirst({
      where: { id, organizationId }
    });

    if (!existing) {
      throw new NotFoundError(`Workflow with ID '${id}' not found`);
    }

    await this.prisma.workflow.delete({
      where: { id }
    });

    return { success: true };
  }
}
