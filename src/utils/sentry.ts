import * as Sentry from '@sentry/react'
import { BrowserTracing } from '@sentry/tracing'

/**
 * Sentry Integration for Frontend Error Tracking
 * Enables automatic error capture and performance monitoring
 */

declare global {
  interface ImportMeta {
    env: {
      VITE_SENTRY_DSN?: string
      MODE: string
      DEV: boolean
      PROD: boolean
    }
  }
}

export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN

  // Debug: Show the raw DSN value being received
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

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    tracesSampleRate: 1.0,
    integrations: [
      new BrowserTracing(),
      new Sentry.Replay({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    // Capture 10% of replays for performance monitoring
    replaysSessionSampleRate: 0.1,
    // Capture 100% of replays when an error occurs
    replaysOnErrorSampleRate: 1.0,
  })

  console.log('[Sentry] Initialized for error tracking and performance monitoring')
}

export { Sentry }

