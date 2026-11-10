import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../plugins/prisma.js';
import { ApprovalRepository } from '../repositories/approval.repository.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { WorkflowExecutionService } from '../services/execution.service.js';
import { ValidationError, NotFoundError } from '@nexora/shared';
import { ExecutionStatus, StepStatus } from '@prisma/client';

const ApprovalDecisionSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED']),
  notes: z.string().max(500).optional(),
});

export async function approvalRoutes(app: FastifyInstance) {
  const approvalRepo = new ApprovalRepository(prisma);
  const executionService = new WorkflowExecutionService(prisma);

  // 1. List pending approvals for current organization
  app.get(
    '/api/v1/approvals',
    { preHandler: [authenticate, requirePermission('workflow:read')] },
    async (request) => {
      return approvalRepo.listPending(request.organizationId);
    }
  );

  // 2. Get approval request details
  app.get(
    '/api/v1/approvals/:id',
    { preHandler: [authenticate, requirePermission('workflow:read')] },
    async (request) => {
      const { id } = request.params as { id: string };
      return approvalRepo.findById(request.organizationId, id);
    }
  );

  // 3. Submit approval decision & resume paused workflow execution
  app.post(
    '/api/v1/approvals/:id/decide',
    { preHandler: [authenticate, requirePermission('approval:decide')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const parseResult = ApprovalDecisionSchema.safeParse(request.body);
      if (!parseResult.success) {
        throw new ValidationError('Invalid decision payload', parseResult.error.format());
      }

      const { decision, notes } = parseResult.data;

      // Record the human decision in PostgreSQL
      const resolvedApproval = await approvalRepo.recordDecision(
        request.organizationId,
        id,
        request.authUser.id,
        decision,
        notes
      );

      // Fetch execution and associated step execution
      const execution = await prisma.execution.findUnique({
        where: { id: resolvedApproval.executionId },
      });

      if (!execution) {
        throw new NotFoundError(`Execution '${resolvedApproval.executionId}' not found.`);
      }

      // Update step execution output
      await prisma.stepExecution.update({
        where: { id: resolvedApproval.stepExecutionId },
        data: {
          status: decision === 'APPROVED' ? StepStatus.COMPLETED : StepStatus.FAILED,
          output: {
            approved: decision === 'APPROVED',
            decision,
            notes,
            decidedBy: request.authUser.id,
            decidedAt: new Date().toISOString(),
          },
          completedAt: new Date(),
        },
      });

      // Resume execution if approved, or mark as failed if rejected
      if (decision === 'APPROVED') {
        await prisma.execution.update({
          where: { id: execution.id },
          data: { status: ExecutionStatus.RUNNING },
        });

        // Trigger resume execution
        const resumed = await executionService.runWorkflow({
          organizationId: request.organizationId,
          workflowId: execution.workflowId,
          triggerType: 'resume:approval',
          triggerPayload: {
            approvalId: resolvedApproval.id,
            decision,
            notes,
            previousOutputs: (execution.context as any)?.outputs || {},
          },
        });

        return {
          approval: resolvedApproval,
          resumed: true,
          execution: resumed,
        };
      } else {
        await prisma.execution.update({
          where: { id: execution.id },
          data: {
            status: ExecutionStatus.FAILED,
            error: `Workflow execution rejected at approval step: "${notes || 'No reason specified'}"`,
            completedAt: new Date(),
          },
        });

        return {
          approval: resolvedApproval,
          resumed: false,
          executionStatus: ExecutionStatus.FAILED,
        };
      }
    }
  );
}
