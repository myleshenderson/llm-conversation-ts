import pRetry, { AbortError } from 'p-retry';

export interface RetryOptions {
  retries?: number;
  minTimeout?: number;
  maxTimeout?: number;
  factor?: number;
  randomize?: boolean;
}

export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  retries: 5,           // Try up to 5 times total (initial + 4 retries)
  minTimeout: 1000,     // Start with 1 second
  maxTimeout: 30000,    // Max 30 seconds between retries
  factor: 2,            // Double the timeout each time
  randomize: true       // Add randomization to prevent thundering herd
};

/**
 * Wrapper for making API calls with retry logic
 * Specifically handles rate limiting (429) and server errors (5xx)
 */
export async function withRetry<T>(
  fn: () => Promise<T>, 
  options: RetryOptions = DEFAULT_RETRY_OPTIONS
): Promise<T> {
  return pRetry(fn, {
    retries: options.retries || DEFAULT_RETRY_OPTIONS.retries!,
    minTimeout: options.minTimeout || DEFAULT_RETRY_OPTIONS.minTimeout!,
    maxTimeout: options.maxTimeout || DEFAULT_RETRY_OPTIONS.maxTimeout!,
    factor: options.factor || DEFAULT_RETRY_OPTIONS.factor!,
    randomize: options.randomize ?? DEFAULT_RETRY_OPTIONS.randomize!,
    
    onFailedAttempt: (error) => {
      console.log(`Attempt ${error.attemptNumber} failed. There are ${error.retriesLeft} retries left.`);
      
      // Only retry on specific error conditions
      if (error.message.includes('429') || // Rate limiting
          error.message.includes('502') || // Bad Gateway
          error.message.includes('503') || // Service Unavailable
          error.message.includes('504') || // Gateway Timeout
          error.message.includes('500')) { // Internal Server Error
        
        console.log(`Retrying due to ${error.message.includes('429') ? 'rate limiting' : 'server error'}: ${error.message}`);
        return; // Continue retrying
      }
      
      // Don't retry on other errors (400, 401, 403, etc.)
      throw new AbortError(error.message);
    }
  });
}

/**
 * Helper to check if an error is retryable
 */
export function isRetryableError(error: any): boolean {
  if (!error || typeof error.message !== 'string') {
    return false;
  }
  
  const message = error.message;
  return message.includes('429') || 
         message.includes('500') || 
         message.includes('502') || 
         message.includes('503') || 
         message.includes('504') ||
         message.includes('ECONNRESET') ||
         message.includes('ETIMEDOUT');
}
