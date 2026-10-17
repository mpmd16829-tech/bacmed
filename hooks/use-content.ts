'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { streams as seedStreams, type StreamId, type Subject } from '@/lib/bac-data'
import type { CoachTip } from '@/lib/coach'

const CACHE_PREFIX = 'prepabac-content-v1'

type Source = 'seed' | 'cache' | 'db'

type Cached = { version: number; subjects: Subject[]; coach: CoachTip[]; at: number }

export type ContentState = {
  subjects: Subject[]
  coach: CoachTip[]
  source: Source
  version: number
  refresh: () => void
}

const readCache = (streamId: StreamId): Cached | null => {
  try {
    const raw = window.localStorage.getItem(`${CACHE_PREFIX}:${streamId}`)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Cached
    if (!parsed || !Array.isArray(parsed.subjects)) return null
    return parsed
  } catch {
    return null
  }
}

const writeCache = (streamId: StreamId, value: Cached) => {
  try {
    window.localStorage.setItem(`${CACHE_PREFIX}:${streamId}`, JSON.stringify(value))
  } catch {
    /* quota or private mode: the app keeps working from memory and from the bundled catalogue */
  }
}

/**
 * The catalogue now lives in the database, but the app is still usable offline: the last server
 * answer is kept per stream, and the bundle's own catalogue is the first-run fallback.
 */
export function useContent(streamId: StreamId, online: boolean): ContentState {
  const seed = useMemo(() => seedStreams.find((s) => s.id === streamId)?.subjects ?? [], [streamId])
  const [state, setState] = useState<{ subjects: Subject[]; coach: CoachTip[]; source: Source; version: number }>(() => {
    const cached = typeof window === 'undefined' ? null : readCache(streamId)
    return cached
      ? { subjects: cached.subjects, coach: cached.coach ?? [], source: 'cache', version: cached.version }
      : { subjects: seed, coach: [], source: 'seed', version: 0 }
  })
  const lastPull = useRef(0)

  const pull = useCallback(
    async (force = false) => {
      if (typeof window === 'undefined' || !navigator.onLine) return
      if (!force && Date.now() - lastPull.current < 30_000) return
      lastPull.current = Date.now()
      const cached = readCache(streamId)
      try {
        const response = await fetch(`/api/content?stream=${streamId}`, {
          headers: cached ? { 'If-None-Match': `"content-${cached.version}"` } : undefined,
        })
        if (response.status === 304 && cached) {
          setState({ subjects: cached.subjects, coach: cached.coach ?? [], source: 'cache', version: cached.version })
          return
        }
        if (!response.ok) return
        const json = await response.json()
        const entry = (json.streams ?? []).find((s: { id: string }) => s.id === streamId)
        if (!entry?.subjects?.length) return
        const version = Number(json.version) || 0
        const coach = Array.isArray(json.coach) ? (json.coach as CoachTip[]) : []
        const next: Cached = { version, subjects: entry.subjects, coach, at: Date.now() }
        writeCache(streamId, next)
        setState({ subjects: next.subjects, coach: next.coach, source: 'db', version })
      } catch {
        /* offline or DNS failure: keep whatever is already on screen */
      }
    },
    [streamId],
  )

  useEffect(() => {
    if (!online) return
    pull()
    const visible = () => {
      if (document.visibilityState === 'visible') pull()
    }
    addEventListener('visibilitychange', visible)
    return () => removeEventListener('visibilitychange', visible)
  }, [online, pull])

  const refresh = useCallback(() => pull(true), [pull])

  return { ...state, refresh }
}
