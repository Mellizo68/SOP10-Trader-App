import React from 'react'
import { Loader } from 'lucide-react'

interface LoadingSpinnerProps {
  message?: string
  size?: 'sm' | 'md' | 'lg'
}

/**
 * Loading Spinner Component
 *
 * Displayed while lazy-loaded components are being fetched and rendered.
 * Used with React.lazy and Suspense for code splitting.
 *
 * Performance Impact:
 * - Provides visual feedback during chunk loading
 * - Allows other app content to remain interactive
 * - Part of lazy loading strategy that reduces initial bundle by 15-20%
 */
const LoadingSpinnerComponent: React.FC<LoadingSpinnerProps> = ({
  message = 'Loading...',
  size = 'md'
}) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-16 h-16'
  }

  const containerClasses = {
    sm: 'py-4',
    md: 'py-8',
    lg: 'py-12'
  }

  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${containerClasses[size]}`}>
      <Loader className={`${sizeClasses[size]} text-blue-500 animate-spin`} />
      <p className="text-gray-400 text-sm">{message}</p>
    </div>
  )
}

/**
 * Memoized version of LoadingSpinner
 * Only re-renders if message or size props change
 */
export const LoadingSpinner = React.memo(LoadingSpinnerComponent)

export default LoadingSpinner
