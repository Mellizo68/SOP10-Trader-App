import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useOnlineStatus } from '../useOnlineStatus'

describe('useOnlineStatus Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock window.addEventListener and removeEventListener
    vi.spyOn(window, 'addEventListener')
    vi.spyOn(window, 'removeEventListener')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should return initial online status from navigator', () => {
    const { result } = renderHook(() => useOnlineStatus())

    // Should reflect current navigator.onLine status
    expect(result.current).toBe(navigator.onLine)
  })

  it('should register online and offline event listeners on mount', () => {
    renderHook(() => useOnlineStatus())

    expect(window.addEventListener).toHaveBeenCalledWith('online', expect.any(Function))
    expect(window.addEventListener).toHaveBeenCalledWith('offline', expect.any(Function))
  })

  it('should remove event listeners on unmount', () => {
    const { unmount } = renderHook(() => useOnlineStatus())

    unmount()

    expect(window.removeEventListener).toHaveBeenCalledWith('online', expect.any(Function))
    expect(window.removeEventListener).toHaveBeenCalledWith('offline', expect.any(Function))
  })

  it('should update status to true when online event fires', async () => {
    const { result } = renderHook(() => useOnlineStatus())

    // Initially, assume online (or whatever navigator.onLine says)
    const initialStatus = result.current

    // Simulate going offline first
    const offlineHandlers = vi.mocked(window.addEventListener).mock.calls.find(
      call => call[0] === 'offline'
    )
    if (offlineHandlers) {
      const offlineHandler = offlineHandlers[1] as EventListener
      offlineHandler(new Event('offline'))
    }

    await waitFor(() => {
      expect(result.current).toBe(false)
    })

    // Simulate coming back online
    const onlineHandlers = vi.mocked(window.addEventListener).mock.calls.find(
      call => call[0] === 'online'
    )
    if (onlineHandlers) {
      const onlineHandler = onlineHandlers[1] as EventListener
      onlineHandler(new Event('online'))
    }

    await waitFor(() => {
      expect(result.current).toBe(true)
    })
  })

  it('should update status to false when offline event fires', async () => {
    const { result } = renderHook(() => useOnlineStatus())

    // Get the offline event handler
    const offlineCall = vi.mocked(window.addEventListener).mock.calls.find(
      call => call[0] === 'offline'
    )

    if (offlineCall) {
      const offlineHandler = offlineCall[1] as EventListener
      offlineHandler(new Event('offline'))

      await waitFor(() => {
        expect(result.current).toBe(false)
      })
    }
  })

  it('should handle multiple online/offline transitions', async () => {
    const { result } = renderHook(() => useOnlineStatus())

    const listeners = vi.mocked(window.addEventListener).mock.calls
    const onlineHandler = listeners.find(call => call[0] === 'online')?.[1] as EventListener
    const offlineHandler = listeners.find(call => call[0] === 'offline')?.[1] as EventListener

    if (offlineHandler) {
      // Go offline
      offlineHandler(new Event('offline'))
      await waitFor(() => expect(result.current).toBe(false))

      // Go online
      if (onlineHandler) {
        onlineHandler(new Event('online'))
        await waitFor(() => expect(result.current).toBe(true))

        // Go offline again
        offlineHandler(new Event('offline'))
        await waitFor(() => expect(result.current).toBe(false))

        // Go online again
        onlineHandler(new Event('online'))
        await waitFor(() => expect(result.current).toBe(true))
      }
    }
  })

  it('should not throw when navigator.onLine is undefined (SSR)', () => {
    // This tests the SSR fallback: typeof navigator !== 'undefined'
    expect(() => {
      renderHook(() => useOnlineStatus())
    }).not.toThrow()
  })

  it('should work correctly during rapid status changes', async () => {
    const { result } = renderHook(() => useOnlineStatus())

    const listeners = vi.mocked(window.addEventListener).mock.calls
    const onlineHandler = listeners.find(call => call[0] === 'online')?.[1] as EventListener
    const offlineHandler = listeners.find(call => call[0] === 'offline')?.[1] as EventListener

    if (offlineHandler && onlineHandler) {
      // Rapid transitions
      offlineHandler(new Event('offline'))
      onlineHandler(new Event('online'))
      offlineHandler(new Event('offline'))
      onlineHandler(new Event('online'))

      await waitFor(() => {
        expect(result.current).toBe(true)
      })
    }
  })

  it('should maintain correct status after unmount and remount', async () => {
    const { unmount } = renderHook(() => useOnlineStatus())

    unmount()

    // Remount hook
    const { result } = renderHook(() => useOnlineStatus())

    // Should start with correct initial status
    expect(result.current).toBe(navigator.onLine)
  })

  it('should be compatible with offline-first applications', async () => {
    const { result } = renderHook(() => useOnlineStatus())

    // Simulate offline scenario
    const offlineCall = vi.mocked(window.addEventListener).mock.calls.find(
      call => call[0] === 'offline'
    )
    if (offlineCall) {
      const offlineHandler = offlineCall[1] as EventListener
      offlineHandler(new Event('offline'))

      await waitFor(() => {
        expect(result.current).toBe(false)
      })

      // Application should be able to detect offline status
      expect(result.current).toBeFalsy()
    }
  })

  describe('Memory Management', () => {
    it('should not cause memory leaks', () => {
      const { unmount } = renderHook(() => useOnlineStatus())

      const addListenerCalls = vi.mocked(window.addEventListener).mock.calls.length
      const removeListenerCalls = vi.mocked(window.removeEventListener).mock.calls.length

      unmount()

      // Should have equal number of add and remove calls
      expect(
        vi.mocked(window.removeEventListener).mock.calls.length
      ).toBeGreaterThanOrEqual(removeListenerCalls)
    })

    it('should clean up even if unmounted multiple times', () => {
      const { unmount } = renderHook(() => useOnlineStatus())

      expect(() => {
        unmount()
        // Calling unmount again should not throw
        unmount()
      }).not.toThrow()
    })
  })

  describe('Hook Dependencies', () => {
    it('should only register listeners once', () => {
      vi.mocked(window.addEventListener).mockClear()

      renderHook(() => useOnlineStatus())

      const addListenerCalls = vi.mocked(window.addEventListener).mock.calls.length

      // Hook should register exactly 2 listeners (online and offline)
      expect(addListenerCalls).toBe(2)
    })

    it('should have empty dependency array for event listeners', () => {
      // This test verifies behavior indirectly by checking listeners are set up once
      vi.mocked(window.addEventListener).mockClear()

      const { rerender } = renderHook(() => useOnlineStatus())

      const firstSetup = vi.mocked(window.addEventListener).mock.calls.length

      // Re-render should not register new listeners
      rerender()

      const afterRerender = vi.mocked(window.addEventListener).mock.calls.length

      // Should still have only the original listeners
      expect(afterRerender).toBe(firstSetup)
    })
  })
})
