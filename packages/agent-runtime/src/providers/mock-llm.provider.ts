import type {
  LlmProvider,
  CompletionRequest,
  CompletionResponse,
  ToolCall,
} from '../types.js';

function computeSimpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export class DeterministicMockLlmProvider implements LlmProvider {
  readonly id = 'mock';
  readonly name = 'Deterministic Mock LLM';

  async generateCompletion(request: CompletionRequest): Promise<CompletionResponse> {
    const lastMessage = request.messages[request.messages.length - 1];
    const userContent = lastMessage?.content || '';

    // If the last message was a tool execution response, conclude with a synthesis
    if (lastMessage?.role === 'tool') {
      let parsedToolData: unknown = lastMessage.content;
      try {
        parsedToolData = JSON.parse(lastMessage.content || '{}');
      } catch {
        // keep text
      }

      return {
        message: {
          role: 'assistant',
          content: `Task successfully completed using tool results: ${JSON.stringify(parsedToolData)}`,
        },
        usage: { promptTokens: 120, completionTokens: 45, totalTokens: 165 },
      };
    }

    // Check if tools are provided and if the user prompt requests a tool action
    if (request.tools && request.tools.length > 0) {
      const lower = userContent.toLowerCase();

      // Heuristic: If prompt mentions email or search or crm or lead, trigger matching tool
      if (lower.includes('lead') || lower.includes('contact') || lower.includes('crm')) {
        const crmTool = request.tools.find(
          (t) => t.name.includes('crm') || t.name.includes('createLead') || t.name.includes('findContact')
        ) || request.tools[0];

        const toolCall: ToolCall = {
          id: `call_${Math.random().toString(36).slice(2, 9)}`,
          name: crmTool.name,
          arguments: {
            email: 'lead@enterprise.com',
            title: 'Enterprise Lead from Mock LLM',
            score: 85,
          },
        };

        return {
          message: {
            role: 'assistant',
            content: 'I need to record this lead in the CRM before responding.',
            toolCalls: [toolCall],
          },
          usage: { promptTokens: 95, completionTokens: 40, totalTokens: 135 },
        };
      }

      if (lower.includes('email') || lower.includes('notify') || lower.includes('alert')) {
        const emailTool = request.tools.find(
          (t) => t.name.includes('email') || t.name.includes('slack')
        ) || request.tools[0];

        const toolCall: ToolCall = {
          id: `call_${Math.random().toString(36).slice(2, 9)}`,
          name: emailTool.name,
          arguments: {
            to: 'customer@client.com',
            subject: 'Automated Agent Follow-up',
            body: 'Your request has been processed.',
          },
        };

        return {
          message: {
            role: 'assistant',
            content: 'Sending notification email via tool call.',
            toolCalls: [toolCall],
          },
          usage: { promptTokens: 80, completionTokens: 35, totalTokens: 115 },
        };
      }
    }

    // Default: Direct text or JSON completion
    if (request.responseFormat === 'json') {
      const hash = computeSimpleHash(userContent);
      return {
        message: {
          role: 'assistant',
          content: JSON.stringify({
            classification: hash % 2 === 0 ? 'HIGH_PRIORITY' : 'STANDARD',
            sentiment: 'positive',
            confidence: 0.94,
            keyEntities: ['enterprise', 'automation'],
          }),
        },
        usage: { promptTokens: 110, completionTokens: 50, totalTokens: 160 },
      };
    }

    return {
      message: {
        role: 'assistant',
        content: `[Deterministic Mock LLM] Processed input: "${userContent.slice(0, 100)}..."`,
      },
      usage: { promptTokens: 50, completionTokens: 25, totalTokens: 75 },
    };
  }
}

export const mockLlmProvider = new DeterministicMockLlmProvider();
