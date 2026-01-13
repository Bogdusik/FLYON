/**
 * Retry utility for transient errors
 * Helps with database connection issues and network problems
 */

export interface RetryOptions {
  maxRetries?: number;
  delayMs?: number;
  backoffMultiplier?: number;
  shouldRetry?: (error: any) => boolean;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  delayMs: 100,
  backoffMultiplier: 2,
  shouldRetry: (error: any) => {
    // Retry on transient errors
    const transientErrors = [
      'ECONNRESET',
      'ETIMEDOUT',
      'ENOTFOUND',
      'ECONNREFUSED',
      'timeout',
      'connection',
    ];

    const errorMessage = error?.message?.toLowerCase() || '';
    const errorCode = error?.code?.toLowerCase() || '';

    return transientErrors.some(
      (transient) => errorMessage.includes(transient) || errorCode.includes(transient)
    );
  },
};

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: any;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Don't retry if it's the last attempt or error is not retryable
      if (attempt === opts.maxRetries || !opts.shouldRetry(error)) {
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = opts.delayMs * Math.pow(opts.backoffMultiplier, attempt);

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
