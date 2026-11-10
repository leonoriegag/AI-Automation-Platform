import type {
  LlmProvider,
  CompletionRequest,
  CompletionResponse,
} from '../types.js';

export class OpenAiLlmProvider implements LlmProvider {
  readonly id = 'openai';
  readonly name = 'OpenAI Compatible Provider';

  constructor(
    private apiKey: string = process.env.OPENAI_API_KEY || '',
    private baseUrl: string = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    private model: string = process.env.OPENAI_MODEL || 'gpt-4o-mini'
  ) {}

  async generateCompletion(request: CompletionRequest): Promise<CompletionResponse> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key is missing. Set OPENAI_API_KEY or use deterministic mock provider.');
    }

    const payload: Record<string, unknown> = {
      model: this.model,
      messages: request.messages.map((m) => ({
        role: m.role,
        content: m.content,
        tool_calls: m.toolCalls?.map((tc) => ({
          id: tc.id,
          type: 'function',
          function: {
            name: tc.name,
            arguments: JSON.stringify(tc.arguments),
          },
        })),
        tool_call_id: m.toolCallId,
      })),
      temperature: request.temperature ?? 0.2,
      max_tokens: request.maxTokens ?? 2000,
    };

    if (request.responseFormat === 'json') {
      payload.response_format = { type: 'json_object' };
    }

    if (request.tools && request.tools.length > 0) {
      payload.tools = request.tools.map((t) => ({
        type: 'function',
        function: {
          name: t.name,
          description: t.description,
          parameters: { type: 'object', properties: {} },
        },
      }));
    }

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenAI API error [${res.status}]: ${errText}`);
    }

    const json = (await res.json()) as any;
    const choice = json.choices?.[0];
    const msg = choice?.message;

    return {
      message: {
        role: 'assistant',
        content: msg?.content || '',
        toolCalls: msg?.tool_calls?.map((tc: any) => ({
          id: tc.id,
          name: tc.function?.name,
          arguments: JSON.parse(tc.function?.arguments || '{}'),
        })),
      },
      usage: json.usage
        ? {
            promptTokens: json.usage.prompt_tokens,
            completionTokens: json.usage.completion_tokens,
            totalTokens: json.usage.total_tokens,
          }
        : undefined,
    };
  }
}
