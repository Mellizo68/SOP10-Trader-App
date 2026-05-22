import { Request, Response } from 'express'
import { metrics, MetricsData } from '../utils/metrics.js'
import logger from '../utils/logger.js'

export class HealthController {
  /**
   * Health check endpoint - returns app and database status
   */
  static async checkHealth(req: Request, res: Response): Promise<void> {
    try {
      const healthStatus = metrics.getHealthStatus()
      const metricsData = metrics.getMetrics()

      res.status(200).json({
        status: 'ok',
        health: healthStatus,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version || '1.0.0',
        metrics: {
          totalRequests: metricsData.totalRequests,
          successfulRequests: metricsData.successfulRequests,
          failedRequests: metricsData.failedRequests,
          timeouts: metricsData.timeouts,
          rateLimitErrors: metricsData.rateLimitErrors,
          avgResponseTime: metricsData.avgResponseTime,
          p95ResponseTime: metricsData.p95ResponseTime,
          p99ResponseTime: metricsData.p99ResponseTime,
        },
        memoryUsage: {
          heapUsed: Math.round(metricsData.memoryUsage.heapUsed / 1024 / 1024),
          heapTotal: Math.round(metricsData.memoryUsage.heapTotal / 1024 / 1024),
          external: Math.round((metricsData.memoryUsage.external || 0) / 1024 / 1024),
          rss: Math.round((metricsData.memoryUsage.rss || 0) / 1024 / 1024),
        },
      })
    } catch (error) {
      logger.error('Health check failed', {
        error: (error as Error).message,
        stack: (error as Error).stack,
      })

      res.status(503).json({
        status: 'error',
        health: 'unhealthy',
        message: 'Health check failed',
        timestamp: new Date().toISOString(),
      })
    }
  }

  /**
   * Metrics endpoint - returns detailed application metrics
   * Format compatible with Prometheus
   */
  static async getMetrics(req: Request, res: Response): Promise<void> {
    try {
      const appMetrics = metrics.getMetrics()
      const endpointMetrics = metrics.getEndpointMetrics()

      res.status(200).json({
        timestamp: appMetrics.timestamp,
        uptime: appMetrics.uptime,
        requests: {
          total: appMetrics.totalRequests,
          successful: appMetrics.successfulRequests,
          failed: appMetrics.failedRequests,
          successRate: appMetrics.totalRequests > 0
            ? ((appMetrics.successfulRequests / appMetrics.totalRequests) * 100).toFixed(2) + '%'
            : 'N/A',
        },
        errors: {
          timeouts: appMetrics.timeouts,
          rateLimitErrors: appMetrics.rateLimitErrors,
          validationErrors: appMetrics.validationErrors,
        },
        performance: {
          avgResponseTime: appMetrics.avgResponseTime + 'ms',
          p50ResponseTime: appMetrics.p50ResponseTime + 'ms',
          p95ResponseTime: appMetrics.p95ResponseTime + 'ms',
          p99ResponseTime: appMetrics.p99ResponseTime + 'ms',
        },
        memory: {
          heapUsedMB: Math.round(appMetrics.memoryUsage.heapUsed / 1024 / 1024),
          heapTotalMB: Math.round(appMetrics.memoryUsage.heapTotal / 1024 / 1024),
          externalMB: Math.round((appMetrics.memoryUsage.external || 0) / 1024 / 1024),
          rssMB: Math.round((appMetrics.memoryUsage.rss || 0) / 1024 / 1024),
        },
        endpoints: endpointMetrics.slice(0, 20).map(endpoint => ({
          path: endpoint.path,
          method: endpoint.method,
          requests: endpoint.count,
          successCount: endpoint.successCount,
          errorCount: endpoint.errorCount,
          successRate: endpoint.count > 0
            ? ((endpoint.successCount / endpoint.count) * 100).toFixed(2) + '%'
            : 'N/A',
        })),
      })
    } catch (error) {
      logger.error('Metrics retrieval failed', {
        error: (error as Error).message,
      })

      res.status(500).json({
        status: 'error',
        message: 'Failed to retrieve metrics',
        timestamp: new Date().toISOString(),
      })
    }
  }

  /**
   * Prometheus-compatible metrics endpoint
   * Exposes metrics in Prometheus text format
   */
  static async getPrometheusMetrics(req: Request, res: Response): Promise<void> {
    try {
      const appMetrics = metrics.getMetrics()
      const endpointMetrics = metrics.getEndpointMetrics()

      let prometheusOutput = `# HELP sop10_trader_requests_total Total number of HTTP requests\n`
      prometheusOutput += `# TYPE sop10_trader_requests_total counter\n`
      prometheusOutput += `sop10_trader_requests_total{status="total"} ${appMetrics.totalRequests}\n`
      prometheusOutput += `sop10_trader_requests_total{status="success"} ${appMetrics.successfulRequests}\n`
      prometheusOutput += `sop10_trader_requests_total{status="error"} ${appMetrics.failedRequests}\n`
      prometheusOutput += `\n`

      prometheusOutput += `# HELP sop10_trader_errors Error counts by type\n`
      prometheusOutput += `# TYPE sop10_trader_errors counter\n`
      prometheusOutput += `sop10_trader_errors{type="timeout"} ${appMetrics.timeouts}\n`
      prometheusOutput += `sop10_trader_errors{type="rate_limit"} ${appMetrics.rateLimitErrors}\n`
      prometheusOutput += `sop10_trader_errors{type="validation"} ${appMetrics.validationErrors}\n`
      prometheusOutput += `\n`

      prometheusOutput += `# HELP sop10_trader_response_time_ms Response time in milliseconds\n`
      prometheusOutput += `# TYPE sop10_trader_response_time_ms gauge\n`
      prometheusOutput += `sop10_trader_response_time_ms{percentile="avg"} ${appMetrics.avgResponseTime}\n`
      prometheusOutput += `sop10_trader_response_time_ms{percentile="p50"} ${appMetrics.p50ResponseTime}\n`
      prometheusOutput += `sop10_trader_response_time_ms{percentile="p95"} ${appMetrics.p95ResponseTime}\n`
      prometheusOutput += `sop10_trader_response_time_ms{percentile="p99"} ${appMetrics.p99ResponseTime}\n`
      prometheusOutput += `\n`

      prometheusOutput += `# HELP sop10_trader_uptime_seconds Application uptime in seconds\n`
      prometheusOutput += `# TYPE sop10_trader_uptime_seconds gauge\n`
      prometheusOutput += `sop10_trader_uptime_seconds ${appMetrics.uptime}\n`
      prometheusOutput += `\n`

      prometheusOutput += `# HELP sop10_trader_memory_bytes Memory usage in bytes\n`
      prometheusOutput += `# TYPE sop10_trader_memory_bytes gauge\n`
      prometheusOutput += `sop10_trader_memory_bytes{type="heap_used"} ${appMetrics.memoryUsage.heapUsed}\n`
      prometheusOutput += `sop10_trader_memory_bytes{type="heap_total"} ${appMetrics.memoryUsage.heapTotal}\n`
      prometheusOutput += `sop10_trader_memory_bytes{type="rss"} ${appMetrics.memoryUsage.rss}\n`
      prometheusOutput += `\n`

      prometheusOutput += `# HELP sop10_trader_endpoint_requests_total Requests per endpoint\n`
      prometheusOutput += `# TYPE sop10_trader_endpoint_requests_total counter\n`
      endpointMetrics.forEach(endpoint => {
        prometheusOutput += `sop10_trader_endpoint_requests_total{method="${endpoint.method}",path="${endpoint.path}"} ${endpoint.count}\n`
      })

      res.setHeader('Content-Type', 'text/plain; charset=utf-8')
      res.status(200).send(prometheusOutput)
    } catch (error) {
      logger.error('Prometheus metrics generation failed', {
        error: (error as Error).message,
      })

      res.status(500).json({
        status: 'error',
        message: 'Failed to generate Prometheus metrics',
      })
    }
  }
}
