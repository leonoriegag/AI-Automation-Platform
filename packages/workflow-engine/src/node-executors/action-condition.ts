/**
 * action:condition — conditional branching node
 */

import { z } from 'zod';
import type { NodeExecutor, NodeExecutorInput, NodeExecutorOutput } from '../types.js';
import { ExpressionEngine } from '../expression-engine.js';

const OperatorSchema = z.enum([
  '==', '!=', '>', '>=', '<', '<=',
  'contains', 'startsWith', 'endsWith', 'exists',
]);

const ConditionConfigSchema = z.object({
  left: z.string(),
  operator: OperatorSchema,
  right: z.string().optional(),
});

function evaluate(left: string, operator: string, right: string | undefined): boolean {
  switch (operator) {
    case '==': return left === right;
    case '!=': return left !== right;
    case '>':  return Number(left) > Number(right);
    case '>=': return Number(left) >= Number(right);
    case '<':  return Number(left) < Number(right);
    case '<=': return Number(left) <= Number(right);
    case 'contains':   return left.includes(right ?? '');
    case 'startsWith': return left.startsWith(right ?? '');
    case 'endsWith':   return left.endsWith(right ?? '');
    case 'exists':     return left !== '' && left !== 'undefined' && left !== 'null';
    default: return false;
  }
}

class ActionConditionExecutor implements NodeExecutor {
  readonly nodeType = 'action:condition';
  private readonly expr = new ExpressionEngine();

  async execute({ node, context }: NodeExecutorInput): Promise<NodeExecutorOutput> {
    const config = ConditionConfigSchema.parse(node.config ?? {});

    const leftResolved  = this.expr.resolveString(config.left, context);
    const rightResolved = config.right !== undefined
      ? this.expr.resolveString(config.right, context)
      : undefined;

    const matched = evaluate(leftResolved, config.operator, rightResolved);

    return {
      data: { matched, branch: matched ? 'true' : 'false', left: leftResolved, right: rightResolved },
      message: `Condition "${config.left} ${config.operator} ${config.right ?? ''}" → ${matched}`,
    };
  }
}

export const actionConditionExecutor = new ActionConditionExecutor();
