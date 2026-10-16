'use client'

import { useEffect, useRef, useState } from 'react'

export function usePersistedState<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(initialValue)
  const [ready, setReady] = useState(false)
  const hydratedKey = useRef<string | null>(null)

  useEffect(() => {
    let saved: T | null = null
    try {
      const raw = window.localStorage.getItem(key)
      if (raw) saved = JSON.parse(raw) as T
    } catch {}
    if (hydratedKey.current !== key) {
      hydratedKey.current = key
      // Only apply the stored value on first read, never overwrite a fresh local state.
      if (saved) setValue(saved)
    }
    setReady(true)
  }, [key])

  useEffect(() => {
    if (!ready) return
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // Private mode or quota exceeded: keep working from memory.
    }
  }, [key, ready, value])

  return [value, setValue, ready] as const
}
