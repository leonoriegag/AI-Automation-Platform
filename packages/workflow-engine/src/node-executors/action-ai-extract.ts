/**
 * action:ai:extract — structured field extraction (deterministic mock in Phase 3)
 */

import { z } from 'zod';
import type { NodeExecutor, NodeExecutorInput, NodeExecutorOutput } from '../types.js';
import { ExpressionEngine } from '../expression-engine.js';

function mockExtract(
  text: string,
  schema: Record<string, { type: string; description: string }>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [field, def] of Object.entries(schema)) {
    switch (def.type) {
      case 'number': {
        // Look for number following field name first (e.g. "amount: 450.50" or "amount 450.50")
        const targeted = new RegExp(`${field}[:\\s]+([\\d.]+)`, 'i');
        const matchTargeted = text.match(targeted);
        if (matchTargeted && matchTargeted[1]) {
          result[field] = parseFloat(matchTargeted[1]);
        } else {
          const matchGeneral = text.match(/\d+(\.\d+)?/);
          result[field] = matchGeneral ? parseFloat(matchGeneral[0]) : 0;
        }
        break;
      }
      case 'boolean': {
        result[field] = /\b(yes|true|confirmed|approved)\b/i.test(text);
        break;
      }
      default: {
        const fieldPattern = new RegExp(`${field}[:\\s]+([\\w.@+\\-]+)`, 'i');
        const match = text.match(fieldPattern);
        result[field] = match ? match[1] : `[extracted:${field}]`;
      }
    }
  }
  return result;
}

const FieldDefSchema = z.object({
  type: z.enum(['string', 'number', 'boolean']),
  description: z.string(),
});

const AiExtractConfigSchema = z.object({
  inputTemplate: z.string(),
  schema: z.record(FieldDefSchema),
  provider: z.enum(['mock', 'openai']).default('mock'),
});

class ActionAiExtractExecutor implements NodeExecutor {
  readonly nodeType = 'action:ai:extract';
  private readonly expr = new ExpressionEngine();

  async execute({ node, context }: NodeExecutorInput): Promise<NodeExecutorOutput> {
    const rawConfig = this.expr.resolveConfig(node.config ?? {}, context);
    const config = AiExtractConfigSchema.parse(rawConfig);
    const inputText = this.expr.resolveString(config.inputTemplate, context);

    if (config.provider !== 'mock') {
      throw new Error(`LLM provider "${config.provider}" not yet implemented. Use "mock".`);
    }

    const extracted = mockExtract(inputText, config.schema);
    return {
      data: extracted,
      message: `Extracted ${Object.keys(extracted).length} field(s) from input`,
    };
  }
}

export const actionAiExtractExecutor = new ActionAiExtractExecutor();
