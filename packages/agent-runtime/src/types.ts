import { z } from 'zod';

export type RoleType = 'system' | 'user' | 'assistant' | 'tool';

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ChatMessage {
  role: RoleType;
  content?: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: z.ZodType<any>;
}

export interface CompletionRequest {
  messages: ChatMessage[];
  tools?: ToolDefinition[];
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'text' | 'json';
}

export interface CompletionResponse {
  message: ChatMessage;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface LlmProvider {
  id: string;
  name: string;
  generateCompletion(request: CompletionRequest): Promise<CompletionResponse>;
}

export interface AgentPolicy {
  maxIterations: number;
  maxToolCalls: number;
  timeoutMs: number;
  allowedTools: string[];
}

export interface AgentExecutionContext {
  organizationId: string;
  executionId: string;
  nodeId: string;
  goal: string;
  contextData?: Record<string, unknown>;
}

export interface AgentStepTrace {
  iteration: number;
  thought?: string;
  toolCalls?: Array<{
    tool: string;
    input: unknown;
    output?: unknown;
    error?: string;
  }>;
  durationMs: number;
}

export interface AgentExecutionResult {
  completed: boolean;
  finalAnswer: string;
  structuredOutput?: unknown;
  iterations: number;
  steps: AgentStepTrace[];
  totalTokens: number;
  error?: string;
}
