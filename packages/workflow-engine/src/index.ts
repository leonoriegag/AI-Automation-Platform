import { NodeDefinition, WorkflowGraph } from '@nexora/domain';

export interface WorkflowValidationResult {
  valid: boolean;
  errors: string[];
  topologicalOrder?: string[];
}

export function validateGraphPlaceholder(graph: WorkflowGraph): WorkflowValidationResult {
  return {
    valid: graph.nodes.length > 0,
    errors: graph.nodes.length === 0 ? ['At least one node required'] : [],
    topologicalOrder: graph.nodes.map(n => n.id)
  };
}
