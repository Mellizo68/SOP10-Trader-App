import { useEffect, useState } from 'react'

/**
 * Hook to detect online/offline status
 * Returns true when the browser is online, false when offline
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      console.log('🔗 Application is now online')
    }

    const handleOffline = () => {
      setIsOnline(false)
      console.log('📡 Application is now offline')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return isOnline
}
