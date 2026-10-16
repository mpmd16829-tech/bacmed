import { NextResponse } from 'next/server'
import { Pool } from 'pg'

let pool: Pool | null = null

function getPool() {
  if (!pool) {
    const url = process.env.DATABASE_URL
    if (!url) throw new Error('DATABASE_URL is not set')
    pool = new Pool({ connectionString: url, max: 2, idleTimeoutMillis: 10_000, ssl: { rejectUnauthorized: false } })
  }
  return pool
}

const TABLE = 'progress'

const arrays = (v: unknown): string[] =>
  Array.isArray(v) ? Array.from(new Set(v.filter((x): x is string => typeof x === 'string').map((x) => x.slice(0, 120)))).slice(0, 5000) : []

const attempts = (v: unknown): Record<string, 'success' | 'review'> => {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return {}
  const out: Record<string, 'success' | 'review'> = {}
  for (const [k, val] of Object.entries(v as Record<string, unknown>).slice(0, 5000)) {
    if (val === 'success' || val === 'review') out[k.slice(0, 120)] = val
  }
  return out
}

const profileOf = (v: unknown): string => {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return '{}'
  try {
    return JSON.stringify(v).slice(0, 20000)
  } catch {
    return '{}'
  }
}

const dateOrNull = (v: unknown): string | null =>
  typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null

/** Client timestamp, accepted only if plausible (never in the future, not older than 2020). */
const timeOrNull = (v: unknown): string | null => {
  if (typeof v !== 'string') return null
  const t = Date.parse(v)
  if (Number.isNaN(t)) return null
  const now = Date.now()
  if (t > now + 60_000 || t < Date.parse('2020-01-01')) return null
  return new Date(t).toISOString()
}

export async function GET(request: Request) {
  try {
    const deviceId = new URL(request.url).searchParams.get('deviceId')
    if (!deviceId || deviceId.length > 100) {
      return NextResponse.json({ error: 'deviceId required' }, { status: 400 })
    }
    const result = await getPool().query(
      `SELECT profile, completed_chapters, completed_exercises, completed_sessions, attempts, streak, last_study, updated_at
       FROM ${TABLE} WHERE device_id = $1`,
      [deviceId],
    )
    if (result.rows.length === 0) return NextResponse.json({ found: false })
    const row = result.rows[0]
    return NextResponse.json({
      found: true,
      profile: row.profile,
      completedChapters: row.completed_chapters,
      completedExercises: row.completed_exercises,
      completedSessions: row.completed_sessions,
      attempts: row.attempts,
      streak: row.streak,
      lastStudy: row.last_study,
      updatedAt: row.updated_at,
    })
  } catch (error) {
    console.error('GET /api/progress failed', error)
    return NextResponse.json({ error: 'server error' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'invalid body' }, { status: 400 })
    }
    const b = body as Record<string, unknown>
    const deviceId = typeof b.deviceId === 'string' && b.deviceId.trim() ? b.deviceId.trim().slice(0, 100) : null
    if (!deviceId) return NextResponse.json({ error: 'deviceId required' }, { status: 400 })

    const streak =
      typeof b.streak === 'number' && Number.isFinite(b.streak) ? Math.max(0, Math.min(9999, Math.trunc(b.streak))) : 0
    const savedAt = timeOrNull(b.savedAt) ?? new Date().toISOString()

    await getPool().query(
      `INSERT INTO ${TABLE}
         (device_id, profile, completed_chapters, completed_exercises, completed_sessions, attempts, streak, last_study, updated_at)
       VALUES ($1, $2::jsonb, $3, $4, $5, $6::jsonb, $7, $8, $9)
       ON CONFLICT (device_id) DO UPDATE SET
         profile = EXCLUDED.profile,
         completed_chapters = EXCLUDED.completed_chapters,
         completed_exercises = EXCLUDED.completed_exercises,
         completed_sessions = EXCLUDED.completed_sessions,
         attempts = EXCLUDED.attempts,
         streak = EXCLUDED.streak,
         last_study = EXCLUDED.last_study,
         updated_at = GREATEST(${TABLE}.updated_at, EXCLUDED.updated_at)`,
      [
        deviceId,
        profileOf(b.profile),
        arrays(b.completedChapters),
        arrays(b.completedExercises),
        arrays(b.completedSessions),
        JSON.stringify(attempts(b.attempts)),
        streak,
        dateOrNull(b.lastStudy),
        savedAt,
      ],
    )
    return NextResponse.json({ ok: true, savedAt })
  } catch (error) {
    console.error('PUT /api/progress failed', error)
    return NextResponse.json({ error: 'server error' }, { status: 500 })
  }
}
