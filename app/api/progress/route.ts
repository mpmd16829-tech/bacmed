import { NextResponse } from 'next/server'
import { Pool } from 'pg'

let pool: Pool | null = null

function getPool() {
  if (!pool) {
    const url = process.env.DATABASE_URL
    if (!url) throw new Error('DATABASE_URL is not set')
    pool = new Pool({ connectionString: url, max: 3, ssl: { rejectUnauthorized: false } })
  }
  return pool
}

export async function GET(request: Request) {
  try {
    const deviceId = new URL(request.url).searchParams.get('deviceId')
    if (!deviceId || deviceId.length > 100) {
      return NextResponse.json({ error: 'deviceId required' }, { status: 400 })
    }
    const result = await getPool().query(
      'SELECT profile, completed_chapters, completed_exercises, completed_sessions, attempts, streak, last_study, updated_at FROM progress WHERE device_id = $1',
      [deviceId],
    )
    if (result.rows.length === 0) {
      return NextResponse.json({ found: false })
    }
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
    const deviceId = typeof b.deviceId === 'string' ? b.deviceId.slice(0, 100) : null
    if (!deviceId) {
      return NextResponse.json({ error: 'deviceId required' }, { status: 400 })
    }
    const safeArray = (v: unknown): string[] =>
      Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, 5000) : []
    const safeObject = (v: unknown): Record<string, string> => {
      if (!v || typeof v !== 'object' || Array.isArray(v)) return {}
      const out: Record<string, string> = {}
      for (const [k, val] of Object.entries(v as Record<string, unknown>).slice(0, 5000)) {
        if (typeof val === 'string') out[k.slice(0, 120)] = val.slice(0, 200)
      }
      return out
    }
    const profile = b.profile && typeof b.profile === 'object' ? JSON.stringify(b.profile).slice(0, 10000) : '{}'
    await getPool().query(
      `INSERT INTO progress (device_id, profile, completed_chapters, completed_exercises, completed_sessions, attempts, streak, last_study, updated_at)
       VALUES ($1, $2::jsonb, $3, $4, $5, $6::jsonb, $7, $8, now())
       ON CONFLICT (device_id) DO UPDATE SET
         profile = EXCLUDED.profile,
         completed_chapters = EXCLUDED.completed_chapters,
         completed_exercises = EXCLUDED.completed_exercises,
         completed_sessions = EXCLUDED.completed_sessions,
         streak = EXCLUDED.streak,
         last_study = EXCLUDED.last_study,
         updated_at = now()`,
      [
        deviceId,
        profile,
        safeArray(b.completedChapters),
        safeArray(b.completedExercises),
        safeArray(b.completedSessions),
        JSON.stringify(safeObject(b.attempts)),
        typeof b.streak === 'number' && Number.isFinite(b.streak) ? Math.max(0, Math.min(9999, Math.trunc(b.streak))) : 0,
        typeof b.lastStudy === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(b.lastStudy) ? b.lastStudy : null,
      ],
    )
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('PUT /api/progress sync failed', error)
    return NextResponse.json({ error: 'server error' }, { status: 500 })
  }
}
