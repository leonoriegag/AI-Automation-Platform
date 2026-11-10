/**
 * Retry Policy Engine — Phase 3
 *
 * Implements exponential back-off with jitter as described in ADR-004.
 * Used by DagExecutor to decide whether to retry a failed step.
 */

import { logger } from '@nexora/shared';

export interface RetryPolicy {
  maxAttempts: number;
  /** Initial delay in milliseconds (doubles each attempt) */
  baseDelayMs: number;
  /** Maximum delay cap in milliseconds */
  maxDelayMs: number;
}

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 3,
  baseDelayMs: 500,
  maxDelayMs: 30_000,
};

/**
 * Compute the delay (ms) before the next attempt, with ±25% jitter.
 * Attempt 1 → baseDelayMs, attempt 2 → baseDelayMs*2, …
 */
export function computeRetryDelay(
  attempt: number,
  policy: RetryPolicy = DEFAULT_RETRY_POLICY
): number {
  const exponential = Math.min(
    policy.baseDelayMs * Math.pow(2, attempt - 1),
    policy.maxDelayMs
  );
  // ±25% jitter
  const jitter = exponential * 0.25 * (Math.random() * 2 - 1);
  return Math.max(0, Math.round(exponential + jitter));
}

/**
 * Wait the computed delay, logging the retry intent.
 */
export async function waitBeforeRetry(
  nodeId: string,
  attempt: number,
  policy: RetryPolicy = DEFAULT_RETRY_POLICY
): Promise<void> {
  const delayMs = computeRetryDelay(attempt, policy);
  logger.info('Retrying node after delay', { nodeId, attempt, delayMs });
  await new Promise<void>((resolve) => setTimeout(resolve, delayMs));
}
