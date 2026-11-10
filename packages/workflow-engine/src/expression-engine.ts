/**
 * Expression Engine — Phase 3
 *
 * Evaluates template strings and config objects against the execution context.
 * Wraps the shared `resolveTemplateObject` / `interpolateExpression` utilities
 * with a typed ExecutionContext binding.
 *
 * Template syntax: {{ nodes.nodeId.fieldPath }}  or  {{ trigger.fieldPath }}
 *
 * Security: no eval / new Function. Pure string pattern matching via the
 * shared safe path evaluator.
 */

import {
  resolveTemplateObject,
  interpolateExpression,
} from '@nexora/shared';

import type { ExecutionContext } from './types.js';

/** Build the data bag that templates resolve against. */
function buildDataBag(context: ExecutionContext): Record<string, unknown> {
  return {
    nodes: context.nodeOutputs,
    trigger: context.triggerPayload,
    execution: {
      id: context.executionId,
      organizationId: context.organizationId,
      startedAt: context.startedAt.toISOString(),
    },
    env: {
      NODE_ENV: process.env['NODE_ENV'] ?? 'development',
    },
  };
}

export class ExpressionEngine {
  /**
   * Resolve a single template string such as:
   *   "Hello {{ nodes.greet.name }}!"
   * Returns the interpolated string.
   */
  resolveString(template: string, context: ExecutionContext): string {
    const bag = buildDataBag(context);
    return interpolateExpression(template, bag);
  }

  /**
   * Deep-clone an arbitrary config object, substituting every string value
   * that contains {{ … }} templates.
   */
  resolveConfig<T>(config: T, context: ExecutionContext): T {
    const bag = buildDataBag(context);
    return resolveTemplateObject(config, bag) as T;
  }
}
