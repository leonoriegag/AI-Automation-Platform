import { PrismaClient, ApprovalStatus } from '@prisma/client';
import { NotFoundError } from '@nexora/shared';

export class ApprovalRepository {
  constructor(private prisma: PrismaClient) {}

  async listPending(organizationId: string) {
    return this.prisma.approvalRequest.findMany({
      where: { organizationId, status: ApprovalStatus.PENDING },
      orderBy: { createdAt: 'desc' },
      include: {
        execution: {
          include: {
            workflow: { select: { name: true } }
          }
        }
      }
    });
  }

  async findById(organizationId: string, id: string) {
    const approval = await this.prisma.approvalRequest.findFirst({
      where: { id, organizationId },
      include: {
        execution: {
          include: {
            workflow: { select: { name: true } }
          }
        }
      }
    });

    if (!approval) {
      throw new NotFoundError(`Approval request with ID '${id}' not found`);
    }

    return approval;
  }

  async recordDecision(
    organizationId: string,
    id: string,
    userId: string,
    decision: 'APPROVED' | 'REJECTED',
    notes?: string
  ) {
    const approval = await this.findById(organizationId, id);

    if (approval.status !== ApprovalStatus.PENDING) {
      throw new Error(`Approval request has already been resolved with status: ${approval.status}`);
    }

    return this.prisma.approvalRequest.update({
      where: { id },
      data: {
        status: decision === 'APPROVED' ? ApprovalStatus.APPROVED : ApprovalStatus.REJECTED,
        decidedByUserId: userId,
        decisionNotes: notes,
        decidedAt: new Date()
      }
    });
  }
}
