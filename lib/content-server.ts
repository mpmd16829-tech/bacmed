import { getPool } from './db'
import type { Exercise } from './bac-data'
import type { ChapterRow, CoachTipRow, SubjectRow } from './content-types'
import { asInt, asLocalized, asLocalizedList } from './content-types'
import { streams as seedStreams } from './bac-data'

export const STREAM_IDS = ['C', 'D', 'LM', 'LO', 'TMGM'] as const

/**
 * One shared stamp so /api/content can answer 304 while the client keeps a readable offline copy:
 * any edit (course, exercise, coefficient, tip) moves the version forward.
 */
async function version(pool = getPool()): Promise<number> {
  const rows = await pool.query(
    `SELECT GREATEST(
       (SELECT COALESCE(MAX(updated_at), to_timestamp(0)) FROM chapters),
       (SELECT COALESCE(MAX(updated_at), to_timestamp(0)) FROM exercises),
       (SELECT COALESCE(MAX(updated_at), to_timestamp(0)) FROM subjects),
       (SELECT COALESCE(MAX(updated_at), to_timestamp(0)) FROM stream_subjects),
       (SELECT COALESCE(MAX(updated_at), to_timestamp(0)) FROM coach_tips)
     ) AS stamp`,
  )
  const stamp = new Date(rows.rows[0]?.stamp ?? 0).getTime()
  return Number.isFinite(stamp) ? Math.floor(stamp / 1000) : 0
}

/** Full catalogue from the database. `subjects` may be empty when the seed has never been applied. */
export async function loadCatalogue(pool = getPool()) {
  const [subjectRows, linkRows, chapterRows, exerciseRows, stamp] = await Promise.all([
    pool.query('SELECT id, name, short, position FROM subjects ORDER BY position, id'),
    pool.query('SELECT stream_id, subject_id, coefficient, position FROM stream_subjects ORDER BY stream_id, position, subject_id'),
    pool.query('SELECT * FROM chapters WHERE published ORDER BY position, id'),
    pool.query('SELECT * FROM exercises WHERE published ORDER BY position, id'),
    version(pool),
  ])

  const byChapter = new Map<string, Exercise[]>()
  for (const row of exerciseRows.rows as Record<string, unknown>[]) {
    const exercise: Exercise = {
      id: String(row.id),
      difficulty: Math.min(3, Math.max(1, asInt(row.difficulty, 1))) as 1 | 2 | 3,
      duration: asInt(row.duration, 10),
      question: asLocalized(row.question),
      hint: asLocalized(row.hint),
      answer: asLocalized(row.answer),
      correction: asLocalized(row.correction),
    }
    const list = byChapter.get(String(row.chapter_id)) ?? []
    list.push(exercise)
    byChapter.set(String(row.chapter_id), list)
  }

  const chaptersBySubject = new Map<string, ChapterRow[]>()
  for (const row of chapterRows.rows as Record<string, unknown>[]) {
    const chapter = {
      id: String(row.id),
      subject_id: String(row.subject_id),
      title: asLocalized(row.title),
      summary: asLocalized(row.summary),
      duration: asInt(row.duration, 40),
      prerequisites: asLocalizedList(row.prerequisites),
      objectives: asLocalizedList(row.objectives),
      essentials: asLocalizedList(row.essentials),
      method: asLocalizedList(row.method),
      example: asLocalized(row.example),
      mistakes: asLocalizedList(row.mistakes),
      recap: asLocalized(row.recap),
      position: asInt(row.position, 0),
      published: row.published !== false,
      source: String(row.source ?? 'seed'),
      exercises: byChapter.get(String(row.id)) ?? [],
    }
    const list = chaptersBySubject.get(chapter.subject_id) ?? []
    list.push(chapter)
    chaptersBySubject.set(chapter.subject_id, list)
  }

  const subjectById = new Map<string, { id: string; name: SubjectRow['name']; short: string }>()
  for (const row of subjectRows.rows as Record<string, unknown>[]) {
    subjectById.set(String(row.id), { id: String(row.id), name: asLocalized(row.name), short: String(row.short ?? '') })
  }

  const streams = STREAM_IDS.map((streamId) => {
    const subjects = linkRows.rows
      .filter((r: Record<string, unknown>) => String(r.stream_id) === streamId)
      .map((r: Record<string, unknown>) => {
        const base = subjectById.get(String(r.subject_id))
        if (!base) return null
        return { ...base, coefficient: asInt(r.coefficient, 1), chapters: chaptersBySubject.get(base.id) ?? [] }
      })
      .filter((x): x is SubjectRow => Boolean(x))
    return { id: streamId, subjects }
  })

  return { version: stamp, streams, empty: subjectRows.rowCount === 0 }
}

/** Tips are ordered by priority then recency; the client merges them with its own offline rules. */
export async function loadCoachTips(pool = getPool()): Promise<CoachTipRow[]> {
  const rows = await pool.query(
    'SELECT id, keywords, answer, subject_id, priority, published FROM coach_tips WHERE published ORDER BY priority DESC, id',
  )
  return (rows.rows as Record<string, unknown>[]).map((row) => ({
    id: String(row.id),
    keywords: Array.isArray(row.keywords) ? (row.keywords as string[]) : [],
    answer: asLocalized(row.answer),
    subject_id: row.subject_id ? String(row.subject_id) : null,
    priority: asInt(row.priority, 0),
    published: row.published !== false,
  }))
}

/**
 * Server content is authoritative, but a stream that was never seeded must not empty the app:
 * the bundled catalogue is returned instead so the student always has lessons to read.
 */
export function seedStreamsFor(streamId: string) {
  return seedStreams.find((s) => s.id === streamId)?.subjects ?? []
}
