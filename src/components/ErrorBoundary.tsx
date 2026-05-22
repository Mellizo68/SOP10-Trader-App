import React, { Component, ReactNode } from 'react'
import { Sentry } from '../utils/sentry'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

class ErrorBoundaryComponent extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
    }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to Sentry if available
    if (Sentry && typeof Sentry.captureException === 'function') {
      Sentry.captureException(error, {
        tags: {
          type: 'react-error-boundary',
        },
        extra: {
          componentStack: errorInfo.componentStack,
        },
      });
    }

    console.error('Error caught by Error Boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100 p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
            <div className="text-center">
              <div className="mb-4 text-4xl">⚠️</div>
              <h1 className="text-2xl font-bold text-red-600 mb-2">
                Something went wrong
              </h1>
              <p className="text-gray-600 mb-4">
                An unexpected error occurred. Our team has been notified and we're looking into it.
              </p>
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mb-4 bg-gray-50 p-3 rounded text-left">
                  <summary className="cursor-pointer text-sm font-semibold text-gray-700">
                    Error Details (Development Only)
                  </summary>
                  <pre className="text-xs text-red-600 mt-2 overflow-auto max-h-40">
                    {this.state.error.toString()}
                  </pre>
                </details>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => window.location.href = '/'}
                  className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition-colors"
                >
                  Go Home
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="flex-1 bg-gray-600 text-white py-2 rounded hover:bg-gray-700 transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Use Sentry's wrapper if available, otherwise use the component directly
const FallbackComponent = (
  <div className="min-h-screen flex items-center justify-center">
    <p className="text-red-600">An error has occurred</p>
  </div>
);

export const ErrorBoundary = Sentry && typeof Sentry.withErrorBoundary === 'function'
  ? Sentry.withErrorBoundary(ErrorBoundaryComponent, {
      fallback: FallbackComponent,
      showDialog: false,
    })
  : ErrorBoundaryComponent;
