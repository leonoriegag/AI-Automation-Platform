export interface AgentConfig {
  maxIterations: number;
  maxToolCalls: number;
  timeoutMs: number;
  allowedTools: string[];
}

export interface AgentExecutionResult {
  completed: boolean;
  iterations: number;
  toolCallsExecuted: number;
  output: any;
}
