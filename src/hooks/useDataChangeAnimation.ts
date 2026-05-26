import { useRef, useEffect, useState } from 'react'

interface ChangeAnimationState {
  isAnimating: boolean
  animationClass: string
}

export function useDataChangeAnimation<T>(
  value: T | null,
  duration: number = 600
): ChangeAnimationState {
  const [isAnimating, setIsAnimating] = useState(false)
  const previousValueRef = useRef<T | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // Skip if value is null or hasn't changed
    if (value === null || JSON.stringify(value) === JSON.stringify(previousValueRef.current)) {
      return
    }

    // Trigger animation
    setIsAnimating(true)
    previousValueRef.current = value

    // Clear any pending animation timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // End animation after duration
    timeoutRef.current = setTimeout(() => {
      setIsAnimating(false)
    }, duration)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [value, duration])

  return {
    isAnimating,
    animationClass: isAnimating ? 'animate-pulse-highlight' : '',
  }
}
