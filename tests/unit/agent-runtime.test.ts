import { describe, it, expect } from 'vitest';
import {
  DeterministicMockLlmProvider,
  BoundedAgentRuntime,
  mockLlmProvider,
} from '../../packages/agent-runtime/src/index.js';
import { ConnectorRegistry } from '@nexora/connectors';

describe('AI Agent Runtime — Phase 5', () => {
  it('DeterministicMockLlmProvider generates predictable completions and JSON outputs', async () => {
    const provider = new DeterministicMockLlmProvider();

    // 1. Text completion
    const resText = await provider.generateCompletion({
      messages: [{ role: 'user', content: 'Summarize the account status.' }],
    });
    expect(resText.message.content).toContain('Deterministic Mock LLM');
    expect(resText.usage?.totalTokens).toBeGreaterThan(0);

    // 2. Structured JSON responseFormat
    const resJson = await provider.generateCompletion({
      messages: [{ role: 'user', content: 'Classify incoming inquiry.' }],
      responseFormat: 'json',
    });
    expect(resJson.message.content).toBeDefined();
    const parsed = JSON.parse(resJson.message.content!);
    expect(parsed.confidence).toBe(0.94);
    expect(['HIGH_PRIORITY', 'STANDARD']).toContain(parsed.classification);
  });

  it('BoundedAgentRuntime executes goal using registered connectors and multi-step loop', async () => {
    const registry = ConnectorRegistry.getInstance();
    const runtime = new BoundedAgentRuntime(mockLlmProvider, registry);

    const context = {
      organizationId: '692d98e8-9b60-41dd-aead-db4559878d70',
      executionId: 'exec-agent-1',
      nodeId: 'agent-node-1',
      goal: 'Process enterprise lead for Jane Doe in the crm',
      contextData: {
        email: 'jane@enterprise.com',
        interest: 'Enterprise Automation Platform',
      },
    };

    const result = await runtime.run(context, {
      maxIterations: 4,
      allowedTools: ['crm:createLead', 'email:send'],
    });

    expect(result.completed).toBe(true);
    expect(result.iterations).toBeGreaterThanOrEqual(1);
    expect(result.steps.length).toBeGreaterThanOrEqual(1);
    expect(result.finalAnswer).toContain('Task successfully completed');

    // Ensure step trace captured the tool execution
    const firstStep = result.steps[0];
    expect(firstStep.toolCalls).toBeDefined();
    expect(firstStep.toolCalls?.[0]?.tool).toBe('crm:createLead');
    expect(firstStep.toolCalls?.[0]?.output).toBeDefined();
  });

  it('enforces safety guardrails: blocks tools outside the allowed whitelist', async () => {
    // Custom provider that requests an unauthorized tool
    const rogueLlmProvider = {
      id: 'rogue',
      name: 'Rogue LLM',
      async generateCompletion() {
        return {
          message: {
            role: 'assistant' as const,
            content: 'Attempting to call forbidden tool',
            toolCalls: [
              {
                id: 'call_rogue',
                name: 'forbidden:databaseDrop',
                arguments: {},
              },
            ],
          },
        };
      },
    };

    const registry = ConnectorRegistry.getInstance();
    const runtime = new BoundedAgentRuntime(rogueLlmProvider, registry);

    const context = {
      organizationId: 'org-test',
      executionId: 'exec-agent-block',
      nodeId: 'node-block',
      goal: 'Attempt unauthorized tool call',
    };

    const result = await runtime.run(context, {
      maxIterations: 2,
      allowedTools: ['email:send'], // 'forbidden:databaseDrop' is NOT allowed
    });

    const firstStep = result.steps[0];
    const toolCall = firstStep.toolCalls?.[0];
    expect(toolCall).toBeDefined();
    expect(toolCall?.error).toContain('not in authorized allowedTools whitelist');
  });

  it('enforces safety guardrails: aborts on iteration budget exceeded', async () => {
    const infiniteLlmProvider = {
      id: 'infinite',
      name: 'Infinite Looper',
      async generateCompletion() {
        return {
          message: {
            role: 'assistant' as const,
            content: 'Let me think more and call another tool...',
            toolCalls: [
              {
                id: 'call_infinite',
                name: 'email:send',
                arguments: { to: 'test@nexora.io', subject: 'hi', body: 'body' },
              },
            ],
          },
        };
      },
    };

    const runtime = new BoundedAgentRuntime(infiniteLlmProvider, ConnectorRegistry.getInstance());

    const result = await runtime.run(
      {
        organizationId: 'org-test',
        executionId: 'exec-limit',
        nodeId: 'node-limit',
        goal: 'Loop indefinitely',
      },
      {
        maxIterations: 2,
        maxToolCalls: 5,
        allowedTools: ['email:send'],
      }
    );

    expect(result.completed).toBe(false);
    expect(result.iterations).toBe(2);
    expect(result.finalAnswer).toContain('Max iterations reached');
  });
});
