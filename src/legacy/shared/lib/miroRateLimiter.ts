/**
 * Miro API Rate Limiter
 *
 * Provides rate limiting and exponential backoff for Miro API calls.
 * Miro's rate limits: ~10,000 credits per app per 5 minutes (varies by endpoint)
 *
 * Features:
 * - Token bucket algorithm for rate limiting
 * - Exponential backoff with jitter for retries
 * - Request queue for burst protection
 * - Credit tracking per endpoint type
 */

import { createLogger } from './logger';

const logger = createLogger('MiroRateLimiter');

// Rate limit configuration
const CONFIG = {
  // Max requests per second (conservative to stay under limits)
  maxRequestsPerSecond: 5,

  // Token bucket refill rate
  tokensPerSecond: 5,

  // Max burst size
  maxTokens: 20,

  // Retry configuration
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,

  // Queue configuration
  maxQueueSize: 100,
  queueTimeoutMs: 60000,
} as const;

// Token bucket state
let tokens: number = CONFIG.maxTokens;
let lastRefill = Date.now();

// Request queue
interface QueuedRequest<T> {
  execute: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  addedAt: number;
  priority: number;
}

const requestQueue: QueuedRequest<unknown>[] = [];
let isProcessingQueue = false;

// Stats for monitoring
const stats = {
  requestsThisMinute: 0,
  requestsTotal: 0,
  retriesTotal: 0,
  rateLimitsHit: 0,
  lastResetTime: Date.now(),
};

/**
 * Refill tokens based on elapsed time
 */
function refillTokens(): void {
  const now = Date.now();
  const elapsedSeconds = (now - lastRefill) / 1000;
  const newTokens = elapsedSeconds * CONFIG.tokensPerSecond;

  tokens = Math.min(CONFIG.maxTokens, tokens + newTokens);
  lastRefill = now;
}

/**
 * Check if a token is available (non-blocking)
 */
function hasToken(): boolean {
  refillTokens();
  return tokens >= 1;
}

/**
 * Consume a token (returns false if no token available)
 */
function consumeToken(): boolean {
  refillTokens();
  if (tokens >= 1) {
    tokens -= 1;
    return true;
  }
  return false;
}

/**
 * Wait until a token is available
 */
async function waitForToken(): Promise<void> {
  while (!hasToken()) {
    const waitTime = Math.ceil((1 - tokens) / CONFIG.tokensPerSecond * 1000);
    await sleep(Math.min(waitTime, 200)); // Check every 200ms max
    refillTokens();
  }
  consumeToken();
}

/**
 * Sleep helper with jitter
 */
function sleep(ms: number, addJitter = false): Promise<void> {
  const jitter = addJitter ? Math.random() * 100 : 0;
  return new Promise(resolve => setTimeout(resolve, ms + jitter));
}

/**
 * Calculate exponential backoff delay with jitter
 */
function calculateBackoff(attempt: number): number {
  const exponentialDelay = Math.pow(2, attempt) * CONFIG.baseDelayMs;
  const jitter = Math.random() * CONFIG.baseDelayMs;
  return Math.min(exponentialDelay + jitter, CONFIG.maxDelayMs);
}

/**
 * Check if an error is a rate limit error
 */
function isRateLimitError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('rate limit') ||
      message.includes('too many requests') ||
      message.includes('429')
    );
  }
  // Check for HTTP response errors
  if (typeof error === 'object' && error !== null) {
    const err = error as { status?: number; statusCode?: number };
    return err.status === 429 || err.statusCode === 429;
  }
  return false;
}

/**
 * Check if an error is retryable
 */
function isRetryableError(error: unknown): boolean {
  if (isRateLimitError(error)) return true;

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('timeout') ||
      message.includes('network') ||
      message.includes('503') ||
      message.includes('502') ||
      message.includes('service unavailable')
    );
  }

  if (typeof error === 'object' && error !== null) {
    const err = error as { status?: number; statusCode?: number };
    const status = err.status || err.statusCode;
    return status !== undefined && (status === 502 || status === 503 || status === 504 || status === 429);
  }

  return false;
}

/**
 * Process the request queue
 */
async function processQueue(): Promise<void> {
  if (isProcessingQueue) return;
  isProcessingQueue = true;

  try {
    while (requestQueue.length > 0) {
      // Sort by priority (higher first) and age (older first)
      requestQueue.sort((a, b) => {
        if (a.priority !== b.priority) return b.priority - a.priority;
        return a.addedAt - b.addedAt;
      });

      const request = requestQueue[0];
      if (!request) break;

      // Check for timeout
      const now = Date.now();
      if (now - request.addedAt > CONFIG.queueTimeoutMs) {
        requestQueue.shift();
        request.reject(new Error('Request timed out in queue'));
        continue;
      }

      // Wait for rate limit token
      await waitForToken();

      // Execute request
      try {
        const result = await request.execute();
        requestQueue.shift();
        request.resolve(result);
      } catch (error) {
        requestQueue.shift();
        request.reject(error instanceof Error ? error : new Error(String(error)));
      }
    }
  } finally {
    isProcessingQueue = false;
  }
}

/**
 * Reset stats every minute
 */
function maybeResetStats(): void {
  const now = Date.now();
  if (now - stats.lastResetTime >= 60000) {
    stats.requestsThisMinute = 0;
    stats.lastResetTime = now;
  }
}

/**
 * Execute a Miro API request with rate limiting and retries
 *
 * @param fn - The async function to execute
 * @param options - Configuration options
 * @returns The result of the function
 */
export async function withRateLimit<T>(
  fn: () => Promise<T>,
  options: {
    priority?: number;
    maxRetries?: number;
    operationName?: string;
  } = {}
): Promise<T> {
  const {
    // priority option reserved for future use with queue priority
    priority: _priority = 0,
    maxRetries = CONFIG.maxRetries,
    operationName = 'miro_operation',
  } = options;
  void _priority; // Suppress unused variable warning - reserved for future priority queue support

  maybeResetStats();

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Wait for rate limit
      await waitForToken();

      // Update stats
      stats.requestsThisMinute++;
      stats.requestsTotal++;

      // Execute the function
      const result = await fn();

      logger.debug(`${operationName} completed`, {
        attempt: attempt + 1,
        totalRequests: stats.requestsTotal,
      });

      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if this is a rate limit error
      if (isRateLimitError(error)) {
        stats.rateLimitsHit++;
        logger.warn(`Rate limit hit for ${operationName}`, {
          attempt: attempt + 1,
          rateLimitsHit: stats.rateLimitsHit,
        });
      }

      // Check if we should retry
      if (attempt < maxRetries && isRetryableError(error)) {
        stats.retriesTotal++;
        const delay = calculateBackoff(attempt);

        logger.info(`Retrying ${operationName} after ${delay}ms`, {
          attempt: attempt + 1,
          maxRetries,
          error: lastError.message,
        });

        await sleep(delay, true);
        continue;
      }

      // No more retries
      break;
    }
  }

  logger.error(`${operationName} failed after all retries`, {
    error: lastError?.message,
    attempts: maxRetries + 1,
  });

  throw lastError || new Error(`${operationName} failed`);
}

/**
 * Queue a request for execution (useful for batch operations)
 *
 * @param fn - The async function to execute
 * @param priority - Higher priority requests execute first (default: 0)
 * @returns Promise that resolves when the request completes
 */
export function queueRequest<T>(
  fn: () => Promise<T>,
  priority = 0
): Promise<T> {
  return new Promise((resolve, reject) => {
    if (requestQueue.length >= CONFIG.maxQueueSize) {
      reject(new Error('Request queue is full'));
      return;
    }

    requestQueue.push({
      execute: fn,
      resolve: resolve as (value: unknown) => void,
      reject,
      addedAt: Date.now(),
      priority,
    });

    // Start processing queue (non-blocking)
    void processQueue();
  });
}

/**
 * Execute multiple requests with rate limiting, processing in batches
 *
 * @param requests - Array of async functions to execute
 * @param options - Configuration options
 * @returns Results in the same order as input
 */
export async function batchWithRateLimit<T>(
  requests: Array<() => Promise<T>>,
  options: {
    batchSize?: number;
    operationName?: string;
  } = {}
): Promise<Array<{ status: 'fulfilled'; value: T } | { status: 'rejected'; reason: Error }>> {
  const { batchSize = 5, operationName = 'batch_operation' } = options;
  const results: Array<{ status: 'fulfilled'; value: T } | { status: 'rejected'; reason: Error }> = [];

  logger.info(`Starting batch operation: ${operationName}`, {
    totalRequests: requests.length,
    batchSize,
  });

  for (let i = 0; i < requests.length; i += batchSize) {
    const batch = requests.slice(i, i + batchSize);

    const batchResults = await Promise.allSettled(
      batch.map((fn, idx) =>
        withRateLimit(fn, {
          operationName: `${operationName}[${i + idx}]`,
        })
      )
    );

    results.push(
      ...batchResults.map(r =>
        r.status === 'fulfilled'
          ? { status: 'fulfilled' as const, value: r.value }
          : { status: 'rejected' as const, reason: r.reason instanceof Error ? r.reason : new Error(String(r.reason)) }
      )
    );

    // Small delay between batches to avoid bursts
    if (i + batchSize < requests.length) {
      await sleep(200);
    }
  }

  const succeeded = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;

  logger.info(`Batch operation completed: ${operationName}`, {
    succeeded,
    failed,
    total: requests.length,
  });

  return results;
}

/**
 * Get current rate limiter statistics
 */
export function getRateLimiterStats(): {
  requestsThisMinute: number;
  requestsTotal: number;
  retriesTotal: number;
  rateLimitsHit: number;
  availableTokens: number;
  queueLength: number;
} {
  refillTokens();
  return {
    requestsThisMinute: stats.requestsThisMinute,
    requestsTotal: stats.requestsTotal,
    retriesTotal: stats.retriesTotal,
    rateLimitsHit: stats.rateLimitsHit,
    availableTokens: Math.floor(tokens),
    queueLength: requestQueue.length,
  };
}

/**
 * Reset rate limiter (for testing)
 */
export function resetRateLimiter(): void {
  tokens = CONFIG.maxTokens;
  lastRefill = Date.now();
  requestQueue.length = 0;
  stats.requestsThisMinute = 0;
  stats.requestsTotal = 0;
  stats.retriesTotal = 0;
  stats.rateLimitsHit = 0;
  stats.lastResetTime = Date.now();
}

export const miroRateLimiter = {
  withRateLimit,
  queueRequest,
  batchWithRateLimit,
  getStats: getRateLimiterStats,
  reset: resetRateLimiter,
};
