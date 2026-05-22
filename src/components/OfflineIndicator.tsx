import { useOnlineStatus } from '../hooks/useOnlineStatus'

/**
 * Offline Indicator Component
 * Displays a banner when the application is offline
 */
export function OfflineIndicator(): JSX.Element | null {
  const isOnline = useOnlineStatus()

  if (isOnline) {
    return null
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-red-600 text-white py-3 px-4 flex items-center gap-3 shadow-lg">
      <div className="flex-shrink-0">
        <span className="text-lg">📡</span>
      </div>
      <div className="flex-1">
        <p className="font-medium">You are offline</p>
        <p className="text-sm text-red-100">
          Your changes will be saved when you reconnect
        </p>
      </div>
    </div>
  )
}
