'use client'

import { useEffect, useRef } from 'react'

export type SyncData = {
  locale: string
  profile: Record<string, unknown>
  completedChapters: string[]
  completedExercises: string[]
  completedSessions: string[]
  attempts: Record<string, string>
  streak: number
  lastStudy: string
}

const DEVICE_KEY = 'prepabac-device-id'

export function getDeviceId(): string | null {
  try {
    let id = window.localStorage.getItem(DEVICE_KEY)
    if (!id) {
      id = crypto.randomUUID()
      window.localStorage.setItem(DEVICE_KEY, id)
    }
    return id
  } catch {
    return null
  }
}

export function useProgressSync(data: SyncData | null, ready: boolean, online: boolean) {
  // Serialize the payload so the effect only fires on real content changes.
  const serialized = data ? JSON.stringify(data) : ''
  const inFlight = useRef(false)

  useEffect(() => {
    if (!ready || !online || !serialized) return
    const deviceId = getDeviceId()
    if (!deviceId) return
    if (inFlight.current) return
    inFlight.current = true
    const body = serialized
    fetch('/api/progress', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    })
      .catch(() => {})
      .finally(() => {
        inFlight.current = false
      })
  }, [ready, online, serialized])
}
