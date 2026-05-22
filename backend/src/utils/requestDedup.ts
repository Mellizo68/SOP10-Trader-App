import logger from './logger.js';

/**
 * Request Deduplication Utility
 * Prevents simultaneous duplicate requests for the same data
 *
 * Problem: When multiple clients request the same endpoint simultaneously
 * (e.g., 5 users requesting /api/market/data/SPY at the same time),
 * we make 5 API calls instead of 1.
 *
 * Solution: Track in-flight requests and return the same promise
 * to all concurrent requesters.
 *
 * Usage:
 *   const data = await dedup.execute('market:SPY', async () => {
 *     return await flashAlphaClient.getMarketData('SPY')
 *   })
 */

interface InFlightRequest<T> {
  promise: Promise<T>;
  timestamp: number;
  requestCount: number;
}

export class RequestDeduplicator {
  private inFlightRequests = new Map<string, InFlightRequest<any>>();
  private stats = {
    totalRequests: 0,
    deduplicatedRequests: 0,
    failedRequests: 0,
  };

  /**
   * Execute a request with deduplication
   * If a request with the same key is already in-flight, return that promise
   * Otherwise, execute the function and store the promise for other callers
   */
  async execute<T>(key: string, fn: () => Promise<T>): Promise<T> {
    this.stats.totalRequests++;

    // Check if there's already a request in-flight for this key
    const inFlight = this.inFlightRequests.get(key);

    if (inFlight) {
      this.stats.deduplicatedRequests++;

      if (process.env.NODE_ENV !== 'production') {
        logger.debug('Request deduplicated', {
          key,
          concurrentRequests: inFlight.requestCount + 1,
        });
      }

      inFlight.requestCount++;
      return inFlight.promise;
    }

    // No in-flight request exists, execute the function
    const promise = fn()
      .then(result => {
        // Clean up after success
        this.inFlightRequests.delete(key);
        return result;
      })
      .catch(error => {
        // Clean up after error
        this.inFlightRequests.delete(key);
        this.stats.failedRequests++;
        throw error;
      });

    // Store the in-flight request
    this.inFlightRequests.set(key, {
      promise,
      timestamp: Date.now(),
      requestCount: 1,
    });

    logger.debug('New request initiated', {
      key,
      inFlightCount: this.inFlightRequests.size,
    });

    return promise;
  }

  /**
   * Get deduplication statistics
   */
  getStats() {
    const dedupRate =
      this.stats.totalRequests > 0
        ? ((this.stats.deduplicatedRequests / this.stats.totalRequests) * 100).toFixed(2)
        : 0;

    return {
      ...this.stats,
      dedupRate: `${dedupRate}%`,
      inFlightCount: this.inFlightRequests.size,
    };
  }

  /**
   * Get count of in-flight requests
   */
  getInFlightCount(): number {
    return this.inFlightRequests.size;
  }

  /**
   * Clear all in-flight requests (useful for testing)
   */
  clear(): void {
    this.inFlightRequests.clear();
    logger.debug('Request deduplicator cleared');
  }
}

/**
 * Global deduplicator instance
 */
export const dedup = new RequestDeduplicator();

export default dedup;
