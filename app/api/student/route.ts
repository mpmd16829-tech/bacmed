import { NextResponse } from 'next/server'
import { randomBytes } from 'node:crypto'
import { getPool, hasDatabase } from '@/lib/db'

export const runtime = 'nodejs'

// Alphabet without 0/O/1/I so a code read aloud in class survives transcription.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function newCode() {
  const bytes = randomBytes(6)
  const body = Array.from(bytes, (byte) => ALPHABET[byte % ALPHABET.length]).join('')
  return `BAC-${body}`
}

const deviceIdOf = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim().slice(0, 100) : '')
const codeOf = (value: unknown) => (typeof value === 'string' ? value.trim().toUpperCase().replace(/\s+/g, '').slice(0, 20) : '')

/** Union of two stored progress rows: nothing mastered is ever lost when devices meet. */
function mergeRows(rows: Record<string, unknown>[]) {
  const ordered = [...rows].sort((a, b) => new Date(String(b.updated_at)).getTime() - new Date(String(a.updated_at)).getTime())
  const latest = ordered[0] ?? {}
  const union = (key: string) => Array.from(new Set(rows.flatMap((row) => (Array.isArray(row[key]) ? (row[key] as string[]) : []))))
  const attempts: Record<string, 'success' | 'review'> = {}
  for (const row of rows) {
    const source = (row.attempts ?? {}) as Record<string, 'success' | 'review'>
    for (const [id, value] of Object.entries(source)) {
      if (value === 'success' || value === 'review') attempts[id] = attempts[id] === 'success' ? 'success' : value
    }
  }
  return {
    profile: latest.profile ?? {},
    completedChapters: union('completed_chapters'),
    completedExercises: union('completed_exercises'),
    completedSessions: union('completed_sessions'),
    attempts,
    streak: Math.max(0, ...rows.map((row) => Number(row.streak) || 0)),
    lastStudy: rows.map((row) => row.last_study).filter(Boolean).sort().reverse()[0] ?? null,
  }
}

async function ensureStudent(deviceId: string, code: string, teacher: string | null) {
  const pool = getPool()
  await pool.query(
    `INSERT INTO students (code, device_id, teacher_code, last_seen_at) VALUES ($1,$2,$3, now())
     ON CONFLICT (code) DO UPDATE SET device_id = EXCLUDED.device_id, last_seen_at = now(),
       teacher_code = COALESCE(EXCLUDED.teacher_code, students.teacher_code)`,
    [code, deviceId, teacher],
  )
}

/**
 * POST {op:'claim', deviceId, teacherCode?}  -> the device's own student code (created once).
 * POST {op:'attach', deviceId, code}         -> this device takes over an existing student code.
 * The code, not the browser, is the identity: that is what lets a student change phones.
 */
export async function POST(request: Request) {
  if (!hasDatabase()) return NextResponse.json({ error: 'base non configurée' }, { status: 503 })
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  const deviceId = deviceIdOf(body?.deviceId)
  if (!deviceId) return NextResponse.json({ error: 'deviceId requis' }, { status: 400 })
  const pool = getPool()

  try {
    const op = String(body?.op ?? 'claim')

    if (op === 'claim') {
      const teacher = codeOf(body?.teacherCode) || null
      if (teacher) {
        const valid = await pool.query('SELECT code FROM teachers WHERE code = $1 AND active', [teacher])
        if (!valid.rows.length) return NextResponse.json({ error: "code enseignant inconnu ou désactivé", bad: 'teacher' }, { status: 400 })
      }
      const existing = await pool.query('SELECT code FROM students WHERE device_id = $1', [deviceId])
      if (existing.rows.length) {
        await ensureStudent(deviceId, String(existing.rows[0].code), teacher)
        return NextResponse.json({ code: String(existing.rows[0].code), created: false })
      }
      // Retry on the (rare) collision: the unique index is the arbiter, not a read-then-write.
      for (let attempt = 0; attempt < 4; attempt += 1) {
        const code = await newCodeOrReuse(pool, deviceId)
        try {
          await ensureStudent(deviceId, code, teacher)
          await pool.query('UPDATE progress SET student_code = $2 WHERE device_id = $1 AND student_code IS NULL', [deviceId, code])
          return NextResponse.json({ code, created: true })
        } catch (error) {
          const failure = error as { code?: string }
          if (failure?.code !== '23505') throw error
        }
      }
      return NextResponse.json({ error: 'impossible de générer un code, réessaie' }, { status: 500 })
    }

    if (op === 'attach') {
      const code = codeOf(body?.code)
      if (!/^BAC-[A-Z2-9]{6}$/.test(code)) return NextResponse.json({ error: 'code élève invalide (format BAC-XXXXXX)', bad: 'code' }, { status: 400 })
      const student = await pool.query('SELECT code, teacher_code FROM students WHERE code = $1', [code])
      if (!student.rows.length) return NextResponse.json({ error: 'aucun élève avec ce code', bad: 'code' }, { status: 404 })

      const rows = await pool.query(
        `SELECT profile, completed_chapters, completed_exercises, completed_sessions, attempts, streak, last_study, updated_at
         FROM progress WHERE device_id = $1 OR student_code = $2`,
        [deviceId, code],
      )
      const merged = mergeRows(rows.rows as Record<string, unknown>[])
      await pool.query(
        `INSERT INTO progress (device_id, profile, completed_chapters, completed_exercises, completed_sessions, attempts, streak, last_study, student_code, updated_at)
         VALUES ($1,$2::jsonb,$3,$4,$5,$6::jsonb,$7,$8,$9, now())
         ON CONFLICT (device_id) DO UPDATE SET
           profile = EXCLUDED.profile, completed_chapters = EXCLUDED.completed_chapters, completed_exercises = EXCLUDED.completed_exercises,
           completed_sessions = EXCLUDED.completed_sessions, attempts = EXCLUDED.attempts, streak = EXCLUDED.streak,
           last_study = EXCLUDED.last_study, student_code = EXCLUDED.student_code, updated_at = now()`,
        [
          deviceId,
          JSON.stringify(merged.profile),
          merged.completedChapters,
          merged.completedExercises,
          merged.completedSessions,
          JSON.stringify(merged.attempts),
          merged.streak,
          merged.lastStudy,
          code,
        ],
      )
      // The code now belongs to this device; older devices keep their row but stop claiming it.
      await pool.query('UPDATE progress SET student_code = NULL WHERE student_code = $1 AND device_id <> $2', [code, deviceId])
      await pool.query('UPDATE students SET device_id = $2, last_seen_at = now() WHERE code = $1', [code, deviceId])

      return NextResponse.json({
        ok: true,
        code,
        merged: {
          profile: merged.profile,
          completedChapters: merged.completedChapters,
          completedExercises: merged.completedExercises,
          completedSessions: merged.completedSessions,
          attempts: merged.attempts,
          streak: merged.streak,
          lastStudy: merged.lastStudy,
        },
      })
    }

    return NextResponse.json({ error: `op inconnue: ${op}` }, { status: 400 })
  } catch (error) {
    console.error('POST /api/student failed', error)
    return NextResponse.json({ error: 'server error' }, { status: 500 })
  }
}

async function newCodeOrReuse(pool: ReturnType<typeof getPool>, deviceId: string) {
  const row = await pool.query('SELECT code FROM students WHERE device_id = $1', [deviceId])
  if (row.rows.length) return String(row.rows[0].code)
  return newCode()
}

/** GET ?deviceId= or ?code= : which code protects this device, for the "mon code" screen. */
export async function GET(request: Request) {
  if (!hasDatabase()) return NextResponse.json({ error: 'base non configurée' }, { status: 503 })
  const params = new URL(request.url).searchParams
  const deviceId = deviceIdOf(params.get('deviceId'))
  const code = codeOf(params.get('code'))
  if (!deviceId && !code) return NextResponse.json({ error: 'deviceId ou code requis' }, { status: 400 })
  try {
    const result = await getPool().query(
      `SELECT s.code, s.teacher_code, s.device_id, s.last_seen_at, t.label AS teacher_label
       FROM students s LEFT JOIN teachers t ON t.code = s.teacher_code
       WHERE s.code = $1 OR s.device_id = $2`,
      [code || '__none__', deviceId || '__none__'],
    )
    if (!result.rows.length) return NextResponse.json({ found: false })
    const row = result.rows[0] as Record<string, unknown>
    return NextResponse.json({ found: true, code: row.code, teacherCode: row.teacher_code, teacherLabel: row.teacher_label, lastSeen: row.last_seen_at })
  } catch (error) {
    console.error('GET /api/student failed', error)
    return NextResponse.json({ error: 'server error' }, { status: 500 })
  }
}
