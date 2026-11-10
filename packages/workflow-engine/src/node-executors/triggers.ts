/**
 * Trigger executors — manual, webhook, schedule
 */

import type { NodeExecutor, NodeExecutorInput, NodeExecutorOutput } from '../types.js';

class TriggerManualExecutor implements NodeExecutor {
  readonly nodeType = 'trigger:manual';

  async execute({ context }: NodeExecutorInput): Promise<NodeExecutorOutput> {
    return {
      data: context.triggerPayload ?? {},
      message: 'Manual trigger activated',
    };
  }
}

class TriggerWebhookExecutor implements NodeExecutor {
  readonly nodeType = 'trigger:webhook';

  async execute({ context }: NodeExecutorInput): Promise<NodeExecutorOutput> {
    return {
      data: context.triggerPayload ?? {},
      message: 'Webhook trigger received',
    };
  }
}

class TriggerScheduleExecutor implements NodeExecutor {
  readonly nodeType = 'trigger:schedule';

  async execute({ context }: NodeExecutorInput): Promise<NodeExecutorOutput> {
    return {
      data: {
        ...(typeof context.triggerPayload === 'object' && context.triggerPayload !== null
          ? (context.triggerPayload as Record<string, unknown>)
          : {}),
        firedAt: new Date().toISOString(),
      },
      message: 'Scheduled trigger fired',
    };
  }
}

export const triggerManualExecutor = new TriggerManualExecutor();
export const triggerWebhookExecutor = new TriggerWebhookExecutor();
export const triggerScheduleExecutor = new TriggerScheduleExecutor();
