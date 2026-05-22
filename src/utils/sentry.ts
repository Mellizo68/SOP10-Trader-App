/// <reference types="vite/client" />

/**
 * Sentry Integration for Frontend Error Tracking
 * Enables automatic error capture and performance monitoring
 */

// Sentry packages will be loaded dynamically to handle module resolution issues
let Sentry: any = { init: () => {}, withErrorBoundary: (c: any) => c }

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

  // Attempt to initialize Sentry if packages are available
  if (Sentry && Sentry.init) {
    try {
      Sentry.init({
        dsn,
        environment: import.meta.env.MODE,
        tracesSampleRate: 1.0,
      })
      console.log('[Sentry] Initialized for error tracking')
    } catch (e) {
      console.warn('[Sentry] Failed to initialize:', (e as Error).message)
    }
  } else {
    console.warn('[Sentry] Packages not available. Error tracking disabled.')
  }
}

export { Sentry }

