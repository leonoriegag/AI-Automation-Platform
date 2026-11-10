import { logger, ExecutionBudgetExceededError } from '@nexora/shared';
import { ConnectorRegistry } from '@nexora/connectors';
import type {
  LlmProvider,
  AgentPolicy,
  AgentExecutionContext,
  AgentExecutionResult,
  AgentStepTrace,
  ChatMessage,
  ToolDefinition,
} from './types.js';

export const DEFAULT_AGENT_POLICY: AgentPolicy = {
  maxIterations: 5,
  maxToolCalls: 5,
  timeoutMs: 30000,
  allowedTools: ['crm:createLead', 'crm:findContact', 'email:send', 'slack:postMessage'],
};

export class BoundedAgentRuntime {
  constructor(
    private provider: LlmProvider,
    private connectorRegistry: ConnectorRegistry = ConnectorRegistry.getInstance()
  ) {}

  async run(
    context: AgentExecutionContext,
    policy: Partial<AgentPolicy> = {}
  ): Promise<AgentExecutionResult> {
    const activePolicy: AgentPolicy = { ...DEFAULT_AGENT_POLICY, ...policy };
    const startTime = Date.now();
    const traces: AgentStepTrace[] = [];
    let totalTokens = 0;
    let toolCallCount = 0;

    // 1. Prepare allowed tool declarations for LLM
    const tools: ToolDefinition[] = activePolicy.allowedTools.map((toolId) => {
      const [connectorId, opId] = toolId.includes(':') ? toolId.split(':') : [toolId, 'default'];
      const op = this.connectorRegistry.getOperation(connectorId, opId);
      return {
        name: toolId,
        description: op?.description || `Operation ${opId} of connector ${connectorId}`,
        parameters: op?.inputSchema as any,
      };
    });

    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `You are an autonomous AI Agent operating within the NEXORA enterprise platform.
Your primary goal: "${context.goal}".
Context data: ${JSON.stringify(context.contextData || {})}.
Follow these strict policies:
- You may use tools when required to fetch or update data.
- Only use tools provided in the tool definitions.
- When finished, summarize your actions and provide the final resolution.`,
      },
      {
        role: 'user',
        content: `Please execute the goal: ${context.goal}`,
      },
    ];

    let iteration = 0;
    let finalAnswer = '';

    while (iteration < activePolicy.maxIterations) {
      iteration++;

      // Guardrail: Wall-clock timeout check
      if (Date.now() - startTime > activePolicy.timeoutMs) {
        throw new ExecutionBudgetExceededError(
          `Agent execution exceeded maximum timeout budget of ${activePolicy.timeoutMs}ms`
        );
      }

      const stepStart = Date.now();
      logger.info('Starting agent iteration loop', {
        iteration,
        executionId: context.executionId,
        nodeId: context.nodeId,
      });

      // Call LLM
      const completion = await this.provider.generateCompletion({
        messages,
        tools,
        temperature: 0.1,
      });

      if (completion.usage) {
        totalTokens += completion.usage.totalTokens;
      }

      const assistantMsg = completion.message;
      messages.push(assistantMsg);

      const stepTrace: AgentStepTrace = {
        iteration,
        thought: assistantMsg.content,
        toolCalls: [],
        durationMs: 0,
      };

      // If no tool calls were requested, agent has finished its task
      if (!assistantMsg.toolCalls || assistantMsg.toolCalls.length === 0) {
        finalAnswer = assistantMsg.content || 'Goal accomplished.';
        stepTrace.durationMs = Date.now() - stepStart;
        traces.push(stepTrace);
        break;
      }

      // Execute requested tool calls with governance checks
      for (const call of assistantMsg.toolCalls) {
        toolCallCount++;

        if (toolCallCount > activePolicy.maxToolCalls) {
          throw new ExecutionBudgetExceededError(
            `Agent exceeded maximum permitted tool call count (${activePolicy.maxToolCalls})`
          );
        }

        // Policy Whitelist Check
        if (!activePolicy.allowedTools.includes(call.name)) {
          const rejectMsg = `Tool '${call.name}' is rejected: not in authorized allowedTools whitelist.`;
          logger.warn('Agent tool call unauthorized', { tool: call.name, executionId: context.executionId });

          stepTrace.toolCalls?.push({
            tool: call.name,
            input: call.arguments,
            error: rejectMsg,
          });

          messages.push({
            role: 'tool',
            content: JSON.stringify({ error: rejectMsg }),
            toolCallId: call.id,
          });
          continue;
        }

        // Dispatch to Connector Registry
        const [connectorId, opId] = call.name.includes(':') ? call.name.split(':') : [call.name, 'execute'];
        const op = this.connectorRegistry.getOperation(connectorId, opId);

        if (!op) {
          const err = `Tool operation '${call.name}' not found in registered connectors.`;
          stepTrace.toolCalls?.push({ tool: call.name, input: call.arguments, error: err });
          messages.push({
            role: 'tool',
            content: JSON.stringify({ error: err }),
            toolCallId: call.id,
          });
          continue;
        }

        try {
          const output = await op.execute(
            {
              organizationId: context.organizationId,
              executionId: context.executionId,
              nodeId: context.nodeId,
            },
            {},
            call.arguments
          );

          stepTrace.toolCalls?.push({
            tool: call.name,
            input: call.arguments,
            output,
          });

          messages.push({
            role: 'tool',
            content: JSON.stringify(output),
            toolCallId: call.id,
          });
        } catch (err: any) {
          const msg = err.message || String(err);
          stepTrace.toolCalls?.push({ tool: call.name, input: call.arguments, error: msg });
          messages.push({
            role: 'tool',
            content: JSON.stringify({ error: msg }),
            toolCallId: call.id,
          });
        }
      }

      stepTrace.durationMs = Date.now() - stepStart;
      traces.push(stepTrace);
    }

    const isComplete = Boolean(finalAnswer);

    return {
      completed: isComplete,
      finalAnswer: finalAnswer || 'Max iterations reached without explicit completion.',
      iterations: traces.length,
      steps: traces,
      totalTokens,
    };
  }
}
