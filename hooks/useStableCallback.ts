import { useCallback, useRef, useLayoutEffect } from 'react'

/**
 * Returns a stable callback that doesn't change between renders
 * Useful for preventing unnecessary re-renders when passing callbacks to child components
 */
export function useStableCallback<T extends (...args: any[]) => any>(callback: T): T {
  const callbackRef = useRef(callback)

  useLayoutEffect(() => {
    callbackRef.current = callback
  })

  return useCallback(((...args) => callbackRef.current(...args)) as T, [])
}
