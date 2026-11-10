/**
 * action:ai:classify — text classification (deterministic mock in Phase 3)
 */

import { z } from 'zod';
import type { NodeExecutor, NodeExecutorInput, NodeExecutorOutput } from '../types.js';
import { ExpressionEngine } from '../expression-engine.js';

function simpleHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function mockClassify(
  text: string,
  categories: string[]
): { category: string; confidence: number; reasoning: string } {
  if (categories.length === 0) throw new Error('categories must not be empty');
  const index = simpleHash(text) % categories.length;
  const category = categories[index]!;
  const confidence = 0.7 + (simpleHash(text + category) % 30) / 100;
  return {
    category,
    confidence: Math.round(confidence * 100) / 100,
    reasoning: `[mock] Text hash ${simpleHash(text)} → category index ${index}`,
  };
}

const AiClassifyConfigSchema = z.object({
  inputTemplate: z.string(),
  categories: z.array(z.string()).min(1),
  provider: z.enum(['mock', 'openai']).default('mock'),
});

class ActionAiClassifyExecutor implements NodeExecutor {
  readonly nodeType = 'action:ai:classify';
  private readonly expr = new ExpressionEngine();

  async execute({ node, context }: NodeExecutorInput): Promise<NodeExecutorOutput> {
    const rawConfig = this.expr.resolveConfig(node.config ?? {}, context);
    const config = AiClassifyConfigSchema.parse(rawConfig);
    const inputText = this.expr.resolveString(config.inputTemplate, context);

    if (config.provider !== 'mock') {
      throw new Error(`LLM provider "${config.provider}" not yet implemented. Use "mock".`);
    }

    const result = mockClassify(inputText, config.categories);
    return {
      data: result,
      message: `Classified as "${result.category}" (confidence ${result.confidence})`,
    };
  }
}

export const actionAiClassifyExecutor = new ActionAiClassifyExecutor();
