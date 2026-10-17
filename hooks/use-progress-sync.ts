'use client'

import { useEffect, useRef, useState } from 'react'

export type SyncData = {
  locale: string
  profile: Record<string, unknown>
  completedChapters: string[]
  completedExercises: string[]
  completedSessions: string[]
  attempts: Record<string, string>
  streak: number
  lastStudy: string
  studentCode?: string
}

export type RestoredData = Omit<SyncData, 'locale'> & { attempts: Record<string, 'success' | 'review'> }

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

export type SyncStatus = 'idle' | 'saving' | 'saved' | 'offline' | 'error'

/** Push local progress to the database (once per real content change) and restore it once at startup. */
export function useProgressSync(
  data: SyncData | null,
  ready: boolean,
  online: boolean,
  onRestore?: (restored: RestoredData) => void,
) {
  // Serialize the payload so the effect only fires on real content changes.
  const serialized = data ? JSON.stringify(data) : ''
  // Un-onboarded visitors (a landing on the home page, a bounced visit) must not create a row.
  const onboarded = Boolean(data?.profile?.onboarded)
  const inFlight = useRef(false)
  const lastSent = useRef('')
  const attempted = useRef(false)
  const [restored, setRestored] = useState(false)
  const [status, setStatus] = useState<SyncStatus>('idle')

  // Restore: pull what this device already saved on the server (another browser, after a reset...).
  // Nothing is pushed before this attempt ends, so a fresh local edit can never be overwritten by an
  // older server copy, and an offline session can restore as soon as the connection comes back.
  useEffect(() => {
    if (!ready || !online || attempted.current) return
    attempted.current = true
    const done = () => setRestored(true)
    const deviceId = getDeviceId()
    if (!deviceId || !onRestore) {
      done()
      return
    }
    fetch(`/api/progress?deviceId=${encodeURIComponent(deviceId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (!json?.found) return
        const rawAttempts = json.attempts && typeof json.attempts === 'object' && !Array.isArray(json.attempts) ? json.attempts : {}
        const safeAttempts: Record<string, 'success' | 'review'> = {}
        for (const [k, v] of Object.entries(rawAttempts as Record<string, unknown>)) {
          if (v === 'success' || v === 'review') safeAttempts[k] = v
        }
        const restoredData: RestoredData = {
          profile: json.profile && typeof json.profile === 'object' ? json.profile : {},
          completedChapters: Array.isArray(json.completedChapters) ? json.completedChapters : [],
          completedExercises: Array.isArray(json.completedExercises) ? json.completedExercises : [],
          completedSessions: Array.isArray(json.completedSessions) ? json.completedSessions : [],
          attempts: safeAttempts,
          streak: typeof json.streak === 'number' ? json.streak : 0,
          lastStudy: typeof json.lastStudy === 'string' ? json.lastStudy : '',
          studentCode: typeof json.studentCode === 'string' ? json.studentCode : '',
        }
        // Never resurrect a half-written state: only apply a profile that finished onboarding.
        if (restoredData.profile?.onboarded) onRestore(restoredData)
      })
      .catch(() => setStatus('error'))
      .finally(done)
  }, [ready, online, onRestore])

  // Debounced push: every change schedules one request, and a change that arrives while a request
  // is in flight is still sent when the debounce fires (no lost update, no request per click).
  useEffect(() => {
    if (!ready || !online || !restored || !onboarded) return
    if (!serialized || serialized === lastSent.current) return
    const timer = setTimeout(() => {
      if (inFlight.current || serialized === lastSent.current) return
      const deviceId = getDeviceId()
      if (!deviceId) return
      inFlight.current = true
      lastSent.current = serialized
      setStatus('saving')
      const body = JSON.stringify({ ...(JSON.parse(serialized) as SyncData), deviceId, savedAt: new Date().toISOString() })
      fetch('/api/progress', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      })
        .then((r) => setStatus(r.ok ? 'saved' : 'error'))
        .catch(() => {
          lastSent.current = '' // let the next change retry this payload
          setStatus('error')
        })
        .finally(() => {
          inFlight.current = false
        })
    }, 700)
    return () => clearTimeout(timer)
  }, [ready, online, restored, onboarded, serialized])

  useEffect(() => {
    if (ready && !online) setStatus('offline')
  }, [ready, online])

  return { status }
}
