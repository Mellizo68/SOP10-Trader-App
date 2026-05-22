/**
 * Metrics Collection Utility
 * Tracks performance metrics for monitoring and debugging
 */

export interface MetricsData {
  timestamp: string
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  timeouts: number
  rateLimitErrors: number
  validationErrors: number
  avgResponseTime: number
  p50ResponseTime: number
  p95ResponseTime: number
  p99ResponseTime: number
  uptime: number
  memoryUsage: NodeJS.MemoryUsage
}

interface EndpointMetrics {
  path: string
  method: string
  count: number
  successCount: number
  errorCount: number
  durations: number[]
}

class MetricsCollector {
  private startTime = Date.now()
  private requestCount = 0
  private successCount = 0
  private errorCount = 0
  private timeoutCount = 0
  private rateLimitCount = 0
  private validationErrorCount = 0
  private responseTimes: number[] = []
  private endpointMetrics = new Map<string, EndpointMetrics>()
  private maxDurations = 1000 // Keep last 1000 durations for percentile calculation

  /**
   * Record a successful request
   */
  recordSuccess(path: string, method: string, duration: number): void {
    this.requestCount++
    this.successCount++
    this.recordDuration(path, method, duration, true)
  }

  /**
   * Record a failed request
   */
  recordError(path: string, method: string, duration: number, errorType: 'timeout' | 'rateLimit' | 'validation' | 'server'): void {
    this.requestCount++
    this.errorCount++

    switch (errorType) {
      case 'timeout':
        this.timeoutCount++
        break
      case 'rateLimit':
        this.rateLimitCount++
        break
      case 'validation':
        this.validationErrorCount++
        break
      case 'server':
        // Already counted in errorCount
        break
    }

    this.recordDuration(path, method, duration, false)
  }

  /**
   * Record response duration for percentile calculation
   */
  private recordDuration(path: string, method: string, duration: number, isSuccess: boolean): void {
    this.responseTimes.push(duration)

    // Keep only last N durations to prevent memory bloat
    if (this.responseTimes.length > this.maxDurations) {
      this.responseTimes = this.responseTimes.slice(-this.maxDurations)
    }

    // Track per-endpoint metrics
    const key = `${method} ${path}`
    if (!this.endpointMetrics.has(key)) {
      this.endpointMetrics.set(key, {
        path,
        method,
        count: 0,
        successCount: 0,
        errorCount: 0,
        durations: [],
      })
    }

    const metrics = this.endpointMetrics.get(key)!
    metrics.count++
    if (isSuccess) {
      metrics.successCount++
    } else {
      metrics.errorCount++
    }
    metrics.durations.push(duration)

    // Keep only recent durations per endpoint
    if (metrics.durations.length > 100) {
      metrics.durations = metrics.durations.slice(-100)
    }
  }

  /**
   * Calculate percentile from sorted array
   */
  private calculatePercentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) return 0
    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1
    return sortedArray[Math.max(0, index)]
  }

  /**
   * Get all metrics
   */
  getMetrics(): MetricsData {
    const sortedDurations = [...this.responseTimes].sort((a, b) => a - b)
    const avgResponseTime = this.responseTimes.length > 0
      ? this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length
      : 0

    return {
      timestamp: new Date().toISOString(),
      totalRequests: this.requestCount,
      successfulRequests: this.successCount,
      failedRequests: this.errorCount,
      timeouts: this.timeoutCount,
      rateLimitErrors: this.rateLimitCount,
      validationErrors: this.validationErrorCount,
      avgResponseTime: Math.round(avgResponseTime),
      p50ResponseTime: this.calculatePercentile(sortedDurations, 50),
      p95ResponseTime: this.calculatePercentile(sortedDurations, 95),
      p99ResponseTime: this.calculatePercentile(sortedDurations, 99),
      uptime: Math.round((Date.now() - this.startTime) / 1000),
      memoryUsage: process.memoryUsage(),
    }
  }

  /**
   * Get endpoint-specific metrics
   */
  getEndpointMetrics(): EndpointMetrics[] {
    return Array.from(this.endpointMetrics.values())
      .map(metrics => ({
        ...metrics,
        durations: [], // Don't expose raw durations in endpoint metrics
      }))
      .sort((a, b) => b.count - a.count) // Sort by request count descending
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.requestCount = 0
    this.successCount = 0
    this.errorCount = 0
    this.timeoutCount = 0
    this.rateLimitCount = 0
    this.validationErrorCount = 0
    this.responseTimes = []
    this.endpointMetrics.clear()
  }

  /**
   * Get health status based on metrics
   */
  getHealthStatus(): 'healthy' | 'degraded' | 'unhealthy' {
    if (this.requestCount === 0) return 'healthy'

    const errorRate = this.errorCount / this.requestCount
    const timeoutRate = this.timeoutCount / this.requestCount

    // Unhealthy: >20% errors or >10% timeouts
    if (errorRate > 0.2 || timeoutRate > 0.1) return 'unhealthy'

    // Degraded: >10% errors or >5% timeouts
    if (errorRate > 0.1 || timeoutRate > 0.05) return 'degraded'

    return 'healthy'
  }
}

// Export singleton instance
export const metrics = new MetricsCollector()
