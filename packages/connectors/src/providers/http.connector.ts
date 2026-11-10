import { z } from 'zod';
import { SSRFError } from '@nexora/shared';
import type { ConnectorDefinition, ConnectorOperation, ExecutionContext } from '../types.js';

// Reserved / Private IP checks & cloud metadata defenses
const PRIVATE_IP_PATTERNS = [
  /^localhost$/i,
  /^127\.\d+\.\d+\.\d+$/,
  /^10\.\d+\.\d+\.\d+$/,
  /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/,
  /^192\.168\.\d+\.\d+$/,
  /^\[::1\]$/,
  /^::1$/,
  /^\[::\]$/,
  /^::$/,
  /^0\.0\.0\.0$/,
  /^169\.254\.\d+\.\d+$/,
  /^\[::ffff:127\.\d+\.\d+\.\d+\]$/i,
  /^::ffff:127\.\d+\.\d+\.\d+$/i,
  /^\[::ffff:10\.\d+\.\d+\.\d+\]$/i,
  /^::ffff:10\.\d+\.\d+\.\d+$/i,
  /^\[::ffff:172\.(1[6-9]|2\d|3[01])\.\d+\.\d+\]$/i,
  /^::ffff:172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/i,
  /^\[::ffff:192\.168\.\d+\.\d+\]$/i,
  /^::ffff:192\.168\.\d+\.\d+$/i,
  /^\[::ffff:169\.254\.\d+\.\d+\]$/i,
  /^::ffff:169\.254\.\d+\.\d+$/i,
  /^fd[0-9a-f]{2}:/i,
  /^\[fd[0-9a-f]{2}:/i,
  /^fc[0-9a-f]{2}:/i,
  /^\[fc[0-9a-f]{2}:/i,
  /^fe80:/i,
  /^\[fe80:/i,
  /^metadata\.google\.internal$/i,
  /^metadata$/i,
  /^instance-data$/i,
];

const RESTRICTED_PORTS = new Set([
  '21', '22', '23', '25', '110', '135', '137', '138', '139', '445',
  '2375', '2376', '2379', '3306', '5432', '5433', '6379', '11211', '27017'
]);

export function validateSafeUrl(rawUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new SSRFError(`Invalid URL provided: "${rawUrl}"`);
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new SSRFError(`Disallowed URL protocol: "${parsed.protocol}"`);
  }

  let hostToCheck = parsed.hostname;

  // WHATWG URL parser formats IPv4-mapped IPv6 as [::ffff:hex:hex]
  const ipv4MappedMatch = hostToCheck.match(/^\[?::ffff:([0-9a-f]+):([0-9a-f]+)\]?$/i);
  if (ipv4MappedMatch) {
    const n1 = parseInt(ipv4MappedMatch[1], 16);
    const n2 = parseInt(ipv4MappedMatch[2], 16);
    const decodedIp = [(n1 >> 8) & 0xff, n1 & 0xff, (n2 >> 8) & 0xff, n2 & 0xff].join('.');
    hostToCheck = decodedIp;
  }

  for (const pattern of PRIVATE_IP_PATTERNS) {
    if (pattern.test(parsed.hostname) || pattern.test(hostToCheck)) {
      throw new SSRFError(
        `SSRF Guard: Request to private or loopback target "${parsed.hostname}" is forbidden.`
      );
    }
  }

  if (parsed.port && RESTRICTED_PORTS.has(parsed.port)) {
    throw new SSRFError(
      `SSRF Guard: Request to restricted port "${parsed.port}" is forbidden.`
    );
  }

  return parsed;
}

const HttpRequestInputSchema = z.object({
  url: z.string().min(1),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).default('GET'),
  headers: z.record(z.string()).default({}),
  query: z.record(z.string()).optional(),
  body: z.unknown().optional(),
  timeoutMs: z.number().int().positive().default(10000),
});

export type HttpRequestInput = z.infer<typeof HttpRequestInputSchema>;

const HttpResponseOutputSchema = z.object({
  status: z.number(),
  statusText: z.string(),
  headers: z.record(z.string()),
  data: z.unknown(),
  durationMs: z.number(),
});

export type HttpResponseOutput = z.infer<typeof HttpResponseOutputSchema>;

export const httpRequestOperation: ConnectorOperation<Record<string, unknown>, HttpRequestInput, HttpResponseOutput> = {
  id: 'request',
  name: 'HTTP Request',
  description: 'Issues an SSRF-safe HTTP request with credential injection support',
  inputSchema: HttpRequestInputSchema,
  outputSchema: HttpResponseOutputSchema,
  isIdempotent: false,
  async execute(context: ExecutionContext, _config: Record<string, unknown>, input: HttpRequestInput): Promise<HttpResponseOutput> {
    const targetUrl = validateSafeUrl(input.url);

    if (input.query) {
      for (const [key, value] of Object.entries(input.query)) {
        targetUrl.searchParams.append(key, value);
      }
    }

    const headers = new Headers(input.headers);

    // Credential injection from execution context if present
    if (context.credentials) {
      if (context.credentials['token']) {
        headers.set('Authorization', `Bearer ${context.credentials['token']}`);
      } else if (context.credentials['apiKey']) {
        const headerName = context.credentials['headerName'] || 'X-API-Key';
        headers.set(headerName, context.credentials['apiKey']);
      } else if (context.credentials['username'] && context.credentials['password']) {
        const basic = Buffer.from(`${context.credentials['username']}:${context.credentials['password']}`).toString('base64');
        headers.set('Authorization', `Basic ${basic}`);
      }
    }

    if (!headers.has('Content-Type') && input.body !== undefined && input.method !== 'GET') {
      headers.set('Content-Type', 'application/json');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), input.timeoutMs);
    const start = Date.now();

    try {
      const response = await fetch(targetUrl.toString(), {
        method: input.method,
        headers,
        body: input.method !== 'GET' && input.body !== undefined ? JSON.stringify(input.body) : undefined,
        signal: controller.signal,
        redirect: 'manual', // Manual handling prevents blind SSRF redirect bypass
      });

      // If redirect, validate the redirect target explicitly
      if ([301, 302, 307, 308].includes(response.status)) {
        const location = response.headers.get('Location');
        if (location) {
          validateSafeUrl(new URL(location, targetUrl).toString());
        }
      }

      const durationMs = Date.now() - start;
      const contentType = response.headers.get('content-type') || '';
      const responseData = contentType.includes('application/json')
        ? await response.json()
        : await response.text();

      // Filter out sensitive headers from output data
      const sanitizedHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        if (!['set-cookie', 'authorization'].includes(key.toLowerCase())) {
          sanitizedHeaders[key] = value;
        }
      });

      return {
        status: response.status,
        statusText: response.statusText,
        headers: sanitizedHeaders,
        data: responseData,
        durationMs,
      };
    } finally {
      clearTimeout(timeout);
    }
  },
};

export const httpConnector: ConnectorDefinition = {
  id: 'http',
  name: 'Generic HTTP / REST',
  category: 'api',
  description: 'Enterprise REST Client with SSRF defense and credential injection',
  credentialType: 'NONE',
  operations: new Map([
    [httpRequestOperation.id, httpRequestOperation as ConnectorOperation],
  ]),
};
