'use client'

import { useEffect, useState } from 'react'

export function usePersistedState<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(initialValue)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(key)
      if (saved) setValue(JSON.parse(saved) as T)
    } catch {}
    setReady(true)
  }, [key])

  useEffect(() => {
    if (!ready) return
    window.localStorage.setItem(key, JSON.stringify(value))
  }, [key, ready, value])

  return [value, setValue, ready] as const
}
