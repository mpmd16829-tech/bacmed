import { NextResponse } from 'next/server'
import { TEACHER_COOKIE, readCookie, readToken } from '@/lib/admin'
import { getPool, hasDatabase } from '@/lib/db'

export const runtime = 'nodejs'

const asArray = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])
const asText = (v: unknown, max = 160) => (typeof v === 'string' ? v.slice(0, max) : '')
const bilingual = (v: unknown, fallback = ''): string => {
  if (!v || typeof v !== 'object') return fallback
  const o = v as Record<string, unknown>
  return asText(o.fr, 160) || asText(o.ar, 160) || fallback
}
/** pg rend les colonnes `date`/`timestamptz` en objets Date : tout est normalisé en ISO pour le client. */
const iso = (v: unknown): string => {
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString()
  if (typeof v === 'string') {
    const parsed = Date.parse(v)
    if (!Number.isNaN(parsed)) return new Date(parsed).toISOString()
  }
  return ''
}

/**
 * "Ma classe" : les élèves rattachés au code enseignant connecté, avec leur maîtrise par matière
 * (restreinte à leur filière) et leurs points faibles (questions tentées mais non réussies).
 * Lecture seule : la requête filtre sur le code signé dans le cookie, jamais sur un paramètre client.
 */
export async function GET(request: Request) {
  if (!hasDatabase()) return NextResponse.json({ error: 'base non configurée' }, { status: 503 })
  const session = await readToken(readCookie(request, TEACHER_COOKIE), 'teacher')
  if (!session.ok) return NextResponse.json({ error: 'session enseignant requise' }, { status: 401 })

  try {
    const pool = getPool()
    const [teacherRow, students, chapters, exercises, subjects, links] = await Promise.all([
      pool.query('SELECT code, label, subject_ids FROM teachers WHERE code = $1', [session.label]),
      pool.query(
        `SELECT s.code, s.profile AS student_profile, s.created_at, s.last_seen_at,
                p.profile AS device_profile, p.streak, p.last_study, p.completed_chapters, p.completed_exercises, p.attempts
         FROM students s LEFT JOIN progress p ON p.student_code = s.code
         WHERE s.teacher_code = $1
         ORDER BY s.last_seen_at DESC NULLS LAST LIMIT 300`,
        [session.label],
      ),
      pool.query('SELECT id, subject_id, title FROM chapters WHERE published'),
      pool.query('SELECT id, chapter_id, question FROM exercises WHERE published'),
      pool.query('SELECT id, name FROM subjects ORDER BY position, id'),
      pool.query('SELECT stream_id, subject_id FROM stream_subjects'),
    ])
    if (!teacherRow.rows.length) return NextResponse.json({ error: 'code enseignant supprimé' }, { status: 401 })
    const teacher = teacherRow.rows[0] as Record<string, unknown>

    const titleOf = new Map<string, string>()
    const subjectOf = new Map<string, string>()
    const totalBySubject = new Map<string, number>()
    for (const row of chapters.rows as Record<string, unknown>[]) {
      const id = asText(row.id, 120)
      const subjectId = asText(row.subject_id, 60)
      titleOf.set(id, bilingual(row.title, id))
      subjectOf.set(id, subjectId)
      totalBySubject.set(subjectId, (totalBySubject.get(subjectId) ?? 0) + 1)
    }
    // Une tentative porte sur un exercice : sa référence est l'énoncé, rattaché au chapitre parent.
    for (const row of exercises.rows as Record<string, unknown>[]) {
      const exerciseId = asText(row.id, 120)
      const chapterId = asText(row.chapter_id, 120)
      titleOf.set(exerciseId, bilingual(row.question, titleOf.get(chapterId) ?? exerciseId))
      subjectOf.set(exerciseId, subjectOf.get(chapterId) ?? '')
    }
    const nameOfSubject = new Map<string, string>()
    for (const row of subjects.rows as Record<string, unknown>[]) {
      nameOfSubject.set(asText(row.id, 60), bilingual(row.name, asText(row.id, 60)))
    }
    const subjectsOfStream = new Map<string, string[]>()
    for (const row of links.rows as Record<string, unknown>[]) {
      const stream = asText(row.stream_id, 20)
      subjectsOfStream.set(stream, [...(subjectsOfStream.get(stream) ?? []), asText(row.subject_id, 60)])
    }

    const list = (students.rows as Record<string, unknown>[]).map((row) => {
      const stored = (row.student_profile && typeof row.student_profile === 'object' ? row.student_profile : {}) as Record<string, unknown>
      const device = (row.device_profile && typeof row.device_profile === 'object' ? row.device_profile : {}) as Record<string, unknown>
      const profile = asText(device.name, 80) || asText(device.stream, 10) ? device : stored
      const done = new Set(asArray(row.completed_chapters))
      const stream = asText(profile.stream, 10)
      const scope = stream && subjectsOfStream.has(stream) ? new Set(subjectsOfStream.get(stream)) : null
      const attempts = (row.attempts && typeof row.attempts === 'object' ? row.attempts : {}) as Record<string, unknown>
      const reviews = Object.entries(attempts)
        .filter(([, value]) => value === 'review')
        .slice(0, 40)
        .map(([id]) => ({ id, title: titleOf.get(id) ?? id, subject: nameOfSubject.get(subjectOf.get(id) ?? '') ?? '' }))

      const doneBySubject = new Map<string, number>()
      for (const id of done) {
        const subjectId = subjectOf.get(id)
        if (subjectId) doneBySubject.set(subjectId, (doneBySubject.get(subjectId) ?? 0) + 1)
      }
      const subjectRows = [...totalBySubject.entries()]
        .filter(([id]) => !scope || scope.has(id))
        .map(([id, total]) => {
          const doneCount = doneBySubject.get(id) ?? 0
          return { id, name: nameOfSubject.get(id) ?? id, done: doneCount, total, pct: total ? Math.round((doneCount / total) * 100) : 0 }
        })
        .sort((a, b) => b.pct - a.pct)

      const scopedTotal = subjectRows.reduce((n, s) => n + s.total, 0)
      const scopedDone = subjectRows.reduce((n, s) => n + s.done, 0)

      return {
        code: asText(row.code, 20),
        name: asText(profile.name, 80),
        stream,
        minutes: typeof profile.minutes === 'number' ? profile.minutes : 0,
        streak: Number(row.streak) || 0,
        lastStudy: iso(row.last_study).slice(0, 10),
        lastSeen: iso(row.last_seen_at),
        chaptersDone: done.size,
        exercisesDone: asArray(row.completed_exercises).length,
        value: scopedTotal ? Math.round((scopedDone / scopedTotal) * 100) : 0,
        subjects: subjectRows,
        reviews,
      }
    })

    return NextResponse.json({
      teacher: { code: asText(teacher.code, 20), label: asText(teacher.label, 80) },
      students: list,
      totals: { students: list.length, chapters: chapters.rows.length },
    })
  } catch (error) {
    console.error('GET /api/teacher/students failed', error)
    return NextResponse.json({ error: 'server error' }, { status: 500 })
  }
}
