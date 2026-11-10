/**
 * action:http — SSRF-safe outbound HTTP connector node
 */

import { z } from 'zod';
import { SSRFError } from '@nexora/shared';
import type { NodeExecutor, NodeExecutorInput, NodeExecutorOutput } from '../types.js';
import { ExpressionEngine } from '../expression-engine.js';

// ─── SSRF guard ───────────────────────────────────────────────────────────────

const PRIVATE_RANGES = [
  /^localhost$/i,
  /^127\.\d+\.\d+\.\d+$/,
  /^10\.\d+\.\d+\.\d+$/,
  /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/,
  /^192\.168\.\d+\.\d+$/,
  /^::1$/,
  /^0\.0\.0\.0$/,
  /^169\.254\.\d+\.\d+$/,
  /^fd[0-9a-f]{2}:/i,
];

function assertNotSsrf(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new SSRFError(`Invalid URL: ${url}`);
  }

  const { protocol, hostname } = parsed;
  if (!['http:', 'https:'].includes(protocol)) {
    throw new SSRFError(`Disallowed protocol: ${protocol}`);
  }
  for (const pattern of PRIVATE_RANGES) {
    if (pattern.test(hostname)) {
      throw new SSRFError(
        `SSRF blocked: target host "${hostname}" resolves to a private/reserved range.`
      );
    }
  }
}

// ─── Config schema ────────────────────────────────────────────────────────────

const HttpConfigSchema = z.object({
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).default('GET'),
  url: z.string().min(1),
  headers: z.record(z.string()).default({}),
  body: z.unknown().optional(),
  timeoutMs: z.number().int().positive().default(10_000),
});

// ─── Executor ─────────────────────────────────────────────────────────────────

class ActionHttpExecutor implements NodeExecutor {
  readonly nodeType = 'action:http';
  private readonly expr = new ExpressionEngine();

  async execute({ node, context }: NodeExecutorInput): Promise<NodeExecutorOutput> {
    const rawConfig = this.expr.resolveConfig(node.config ?? {}, context);
    const config = HttpConfigSchema.parse(rawConfig);

    assertNotSsrf(config.url);

    const headers = new Headers(config.headers);
    if (!headers.has('Content-Type') && config.body !== undefined) {
      headers.set('Content-Type', 'application/json');
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.timeoutMs);

    let response: Response;
    try {
      response = await fetch(config.url, {
        method: config.method,
        headers,
        body:
          config.method !== 'GET' && config.body !== undefined
            ? JSON.stringify(config.body)
            : undefined,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    const contentType = response.headers.get('content-type') ?? '';
    const responseBody = contentType.includes('application/json')
      ? await response.json()
      : await response.text();

    return {
      data: {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: responseBody,
      },
      message: `HTTP ${config.method} ${config.url} → ${response.status}`,
    };
  }
}

export const actionHttpExecutor = new ActionHttpExecutor();
