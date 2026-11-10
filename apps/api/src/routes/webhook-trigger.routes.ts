import type { FastifyInstance } from 'fastify';
import { prisma } from '../plugins/prisma.js';
import { WorkflowExecutionService } from '../services/execution.service.js';
import { computeHmac, verifyHmac, UnauthorizedError, NotFoundError } from '@nexora/shared';

export async function webhookTriggerRoutes(app: FastifyInstance) {
  const executionService = new WorkflowExecutionService(prisma);

  // Inbound webhook receiver endpoint
  // Matches: /api/v1/webhooks/:workflowId
  app.post('/api/v1/webhooks/:workflowId', async (request, reply) => {
    const { workflowId } = request.params as { workflowId: string };
    const rawHeaders = request.headers;

    // 1. Fetch workflow and verify it exists and is ACTIVE
    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    });

    if (!workflow) {
      throw new NotFoundError(`Workflow '${workflowId}' not found.`);
    }

    if (workflow.status !== 'ACTIVE') {
      reply.status(400);
      return {
        error: 'Workflow is not currently ACTIVE and cannot receive webhook events.',
        workflowStatus: workflow.status,
      };
    }

    const latestVersion = workflow.versions[0];
    const graph = latestVersion?.graph as any;
    const webhookNode = graph?.nodes?.find((n: any) => n.type === 'trigger:webhook');

    // 2. Validate HMAC signature & timestamp if a secret is configured on the node
    const configuredSecret = webhookNode?.config?.secret;
    const rawSignature = (rawHeaders['x-nexora-signature'] || rawHeaders['x-hub-signature-256'] || rawHeaders['x-signature']) as string | undefined;
    const rawTimestamp = rawHeaders['x-nexora-timestamp'] as string | undefined;

    if (configuredSecret) {
      if (!rawSignature) {
        throw new UnauthorizedError('Missing required HMAC webhook signature header.');
      }

      // Replay prevention: timestamp must be within ±300 seconds (5 min) if provided
      if (rawTimestamp) {
        const reqTime = parseInt(rawTimestamp, 10);
        const currentTime = Math.floor(Date.now() / 1000);
        if (isNaN(reqTime) || Math.abs(currentTime - reqTime) > 300) {
          throw new UnauthorizedError('Webhook timestamp expired or outside replay tolerance window.');
        }
      }

      const bodyStr = typeof request.body === 'string' ? request.body : JSON.stringify(request.body);
      const stringToSign = rawTimestamp ? `${rawTimestamp}.${bodyStr}` : bodyStr;
      const cleanSig = rawSignature.replace(/^sha256=/, '');

      const isValid = verifyHmac(stringToSign, cleanSig, configuredSecret);
      if (!isValid) {
        throw new UnauthorizedError('Invalid HMAC webhook signature.');
      }
    }

    // 3. Trigger workflow execution synchronously/asynchronously
    const execution = await executionService.runWorkflow({
      organizationId: workflow.organizationId,
      workflowId: workflow.id,
      triggerType: 'trigger:webhook',
      triggerPayload: request.body,
    });

    reply.status(202);
    return {
      accepted: true,
      workflowId: workflow.id,
      executionId: execution.executionId,
      status: execution.status,
    };
  });
}
