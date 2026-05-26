import { useRef, useEffect, useState } from 'react'

export function useRowChangeAnimation<T extends { [key: string]: any }>(
  data: T[],
  trackingKey: keyof T
): Map<string | number, boolean> {
  const [animatingRows, setAnimatingRows] = useState<Map<string | number, boolean>>(new Map())
  const previousDataRef = useRef<T[]>([])
  const timeoutRef = useRef<Map<string | number, ReturnType<typeof setTimeout>>>(new Map())

  useEffect(() => {
    const newAnimatingRows = new Map<string | number, boolean>()

    // Check which rows changed
    data.forEach((currentRow, index) => {
      const previousRow = previousDataRef.current?.[index]

      if (previousRow && JSON.stringify(previousRow) !== JSON.stringify(currentRow)) {
        const rowKey = currentRow[trackingKey] || index
        newAnimatingRows.set(rowKey, true)

        // Clear any existing timeout for this row
        if (timeoutRef.current.has(rowKey)) {
          clearTimeout(timeoutRef.current.get(rowKey)!)
        }

        // End animation after 600ms
        const timeout = setTimeout(() => {
          setAnimatingRows((prev) => {
            const updated = new Map(prev)
            updated.delete(rowKey)
            return updated
          })
          timeoutRef.current.delete(rowKey)
        }, 600)

        timeoutRef.current.set(rowKey, timeout)
      }
    })

    // Update state with newly animating rows
    if (newAnimatingRows.size > 0) {
      setAnimatingRows((prev) => new Map([...prev, ...newAnimatingRows]))
    }

    previousDataRef.current = data

    return () => {
      // Cleanup timeouts
      timeoutRef.current.forEach((timeout) => clearTimeout(timeout))
      timeoutRef.current.clear()
    }
  }, [data, trackingKey])

  return animatingRows
}
