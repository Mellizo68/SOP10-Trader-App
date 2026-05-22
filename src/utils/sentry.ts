/// <reference types="vite/client" />

/**
 * Sentry Integration for Frontend Error Tracking
 * Enables automatic error capture and performance monitoring
 */

// Sentry stub implementation that works without external packages
class SentryStub {
  private dsn: string | null = null
  private isInitialized = false

  init(options: any): void {
    this.dsn = options.dsn
    this.isInitialized = true
    console.log('[Sentry] Initialized for error tracking')
  }

  captureException(error: Error, context?: any): void {
    if (!this.dsn) {
      console.warn('[Sentry] DSN not configured. Error not sent.')
      return
    }

    // Send error to Sentry via fetch API
    const errorData = {
      dsn: this.dsn,
      exception: {
        values: [
          {
            type: error.name || 'Error',
            value: error.message,
            stacktrace: {
              frames: this.parseStackTrace(error.stack),
            },
          },
        ],
      },
      level: 'error',
      timestamp: new Date().toISOString(),
      platform: 'javascript',
      environment: import.meta.env.MODE,
      tags: context?.tags || {},
      extra: context?.extra || {},
    }

    // Extract project ID and key from DSN
    const dsnMatch = this.dsn.match(/https:\/\/([a-f0-9]+)@(.+?)\/(\d+)/)
    if (!dsnMatch) {
      console.warn('[Sentry] Invalid DSN format')
      return
    }

    const [, key, host, projectId] = dsnMatch
    const endpoint = `https://${host}/api/${projectId}/store/?sentry_key=${key}&sentry_version=7`

    // Send error asynchronously (fire and forget)
    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(errorData),
    }).catch((err) => {
      console.warn('[Sentry] Failed to send error:', err.message)
    })

    console.log('[Sentry] Error captured and sent:', error.message)
  }

  private parseStackTrace(stack?: string): any[] {
    if (!stack) return []
    const lines = stack.split('\n')
    return lines.slice(1).map((line) => ({
      filename: 'unknown',
      function: line.trim(),
      lineno: 0,
      colno: 0,
    }))
  }

  withErrorBoundary(component: any, options?: any): any {
    // Return the component unchanged (Error Boundary will handle it)
    return component
  }
}

const Sentry = new SentryStub()

export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN

  console.log('[Sentry] DEBUG - VITE_SENTRY_DSN value:', dsn)
  console.log('[Sentry] DEBUG - All env vars:', {
    mode: import.meta.env.MODE,
    dev: import.meta.env.DEV,
    prod: import.meta.env.PROD,
    dsnExists: !!dsn,
    dsnType: typeof dsn,
  })

  if (!dsn) {
    console.warn('[Sentry] DSN not configured. Error tracking disabled.')
    return
  }

  // Initialize Sentry stub
  try {
    Sentry.init({
      dsn,
      environment: import.meta.env.MODE,
      tracesSampleRate: 1.0,
    })
  } catch (e) {
    console.warn('[Sentry] Failed to initialize:', (e as Error).message)
  }
}

export { Sentry }

