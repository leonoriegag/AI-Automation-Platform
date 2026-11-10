/**
 * @nexora/workflow-engine — public API
 */

// Core classes
export { GraphValidator } from './graph-validator.js';
export { ExpressionEngine } from './expression-engine.js';
export { NodeRegistry } from './node-registry.js';
export { DagExecutor } from './dag-executor.js';

// Retry policy
export {
  DEFAULT_RETRY_POLICY,
  computeRetryDelay,
  waitBeforeRetry,
} from './retry-policy.js';

// Types
export type {
  ExecutionContext,
  NodeExecutor,
  NodeExecutorInput,
  NodeExecutorOutput,
  ValidationError,
  ValidationResult,
  StepStatus,
  RetryPolicy,
} from './types.js';

export type { StepResult, ExecutionResult, DagExecutorOptions } from './dag-executor.js';

// Node executors — trigger nodes
export {
  triggerManualExecutor,
  triggerWebhookExecutor,
  triggerScheduleExecutor,
} from './node-executors/triggers.js';

// Node executors — action nodes
export { actionHttpExecutor }        from './node-executors/action-http.js';
export { actionTransformExecutor }   from './node-executors/action-transform.js';
export { actionConditionExecutor }   from './node-executors/action-condition.js';
export { actionDelayExecutor }       from './node-executors/action-delay.js';
export { actionAiClassifyExecutor }  from './node-executors/action-ai-classify.js';
export { actionAiExtractExecutor }   from './node-executors/action-ai-extract.js';
export { actionAgentToolExecutor }   from './node-executors/action-agent-tool.js';
export { actionApprovalExecutor }    from './node-executors/action-approval.js';
export { actionEmailExecutor }       from './node-executors/action-email.js';
export { actionCrmExecutor }         from './node-executors/action-crm.js';
export { actionCompletionExecutor }  from './node-executors/action-completion.js';

// Factory: creates a NodeRegistry pre-loaded with all built-in executors.
import { NodeRegistry } from './node-registry.js';
import { triggerManualExecutor, triggerWebhookExecutor, triggerScheduleExecutor } from './node-executors/triggers.js';
import { actionHttpExecutor }        from './node-executors/action-http.js';
import { actionTransformExecutor }   from './node-executors/action-transform.js';
import { actionConditionExecutor }   from './node-executors/action-condition.js';
import { actionDelayExecutor }       from './node-executors/action-delay.js';
import { actionAiClassifyExecutor }  from './node-executors/action-ai-classify.js';
import { actionAiExtractExecutor }   from './node-executors/action-ai-extract.js';
import { actionAgentToolExecutor }   from './node-executors/action-agent-tool.js';
import { actionApprovalExecutor }    from './node-executors/action-approval.js';
import { actionEmailExecutor }       from './node-executors/action-email.js';
import { actionCrmExecutor }         from './node-executors/action-crm.js';
import { actionCompletionExecutor }  from './node-executors/action-completion.js';

export function createDefaultRegistry(): NodeRegistry {
  const registry = new NodeRegistry();
  registry.register(triggerManualExecutor);
  registry.register(triggerWebhookExecutor);
  registry.register(triggerScheduleExecutor);
  registry.register(actionHttpExecutor);
  registry.register(actionTransformExecutor);
  registry.register(actionConditionExecutor);
  registry.register(actionDelayExecutor);
  registry.register(actionAiClassifyExecutor);
  registry.register(actionAiExtractExecutor);
  registry.register(actionAgentToolExecutor);
  registry.register(actionApprovalExecutor);
  registry.register(actionEmailExecutor);
  registry.register(actionCrmExecutor);
  registry.register(actionCompletionExecutor);
  return registry;
}
