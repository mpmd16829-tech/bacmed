import { getPool } from './db'
import type { Localized } from './i18n'

/**
 * All console writes go through here: one place that sanitises, generates identifiers and keeps
 * `updated_at` moving (that timestamp is what the content version, and therefore the cache, uses).
 */

const TEXT_LIMIT = 6000
const ID_LIMIT = 90

export const localized = (value: unknown): Localized => {
  const o = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>
  const clean = (v: unknown) => (typeof v === 'string' ? v.slice(0, TEXT_LIMIT) : '')
  return { fr: clean(o.fr), ar: clean(o.ar) }
}

export const localizedList = (value: unknown, max = 60): Localized[] =>
  Array.isArray(value) ? value.slice(0, max).map(localized).filter((x) => x.fr || x.ar) : []

export const idFrom = (raw: string, prefix: string) => {
  const slug = raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48)
  const base = `${prefix}-${slug || 'sans-titre'}`
  return `${base.slice(0, ID_LIMIT - 6)}-${Math.random().toString(36).slice(2, 8)}`
}

const int = (v: unknown, fallback: number, min: number, max: number) => {
  const n = typeof v === 'number' && Number.isFinite(v) ? Math.trunc(v) : fallback
  return Math.min(max, Math.max(min, n))
}

const bool = (v: unknown, fallback = true) => (typeof v === 'boolean' ? v : fallback)

export async function upsertChapter(input: Record<string, unknown>, actor: string) {
  const subjectId = typeof input.subject_id === 'string' ? input.subject_id.slice(0, 60) : ''
  if (!subjectId) throw new Error('subject_id required')
  const id = typeof input.id === 'string' && input.id.trim() ? input.id.trim().slice(0, ID_LIMIT) : idFrom(String(input.titleFr ?? input.title ?? ''), subjectId)
  const title = localized(input.title)
  const values = {
    id,
    subject_id: subjectId,
    title: JSON.stringify(title),
    summary: JSON.stringify(localized(input.summary)),
    duration: int(input.duration, 40, 5, 600),
    prerequisites: JSON.stringify(localizedList(input.prerequisites)),
    objectives: JSON.stringify(localizedList(input.objectives)),
    essentials: JSON.stringify(localizedList(input.essentials)),
    method: JSON.stringify(localizedList(input.method)),
    example: JSON.stringify(localized(input.example)),
    mistakes: JSON.stringify(localizedList(input.mistakes)),
    recap: JSON.stringify(localized(input.recap)),
    position: int(input.position, 0, 0, 9999),
    published: bool(input.published),
    source: typeof input.source === 'string' ? input.source.slice(0, 60) : actor,
  }
  await getPool().query(
    `INSERT INTO chapters (id, subject_id, title, summary, duration, prerequisites, objectives, essentials, method, example, mistakes, recap, position, published, source, updated_at)
     VALUES ($1,$2,$3::jsonb,$4::jsonb,$5,$6::jsonb,$7::jsonb,$8::jsonb,$9::jsonb,$10::jsonb,$11::jsonb,$12::jsonb,$13,$14,$15, now())
     ON CONFLICT (id) DO UPDATE SET
       subject_id = EXCLUDED.subject_id, title = EXCLUDED.title, summary = EXCLUDED.summary, duration = EXCLUDED.duration,
       prerequisites = EXCLUDED.prerequisites, objectives = EXCLUDED.objectives, essentials = EXCLUDED.essentials,
       method = EXCLUDED.method, example = EXCLUDED.example, mistakes = EXCLUDED.mistakes, recap = EXCLUDED.recap,
       position = EXCLUDED.position, published = EXCLUDED.published, updated_at = now()`,
    [
      values.id, values.subject_id, values.title, values.summary, values.duration, values.prerequisites,
      values.objectives, values.essentials, values.method, values.example, values.mistakes, values.recap,
      values.position, values.published, values.source,
    ],
  )
  return id
}

export async function upsertExercise(input: Record<string, unknown>, actor: string) {
  const chapterId = typeof input.chapter_id === 'string' ? input.chapter_id.slice(0, ID_LIMIT) : ''
  if (!chapterId) throw new Error('chapter_id required')
  const id = typeof input.id === 'string' && input.id.trim() ? input.id.trim().slice(0, ID_LIMIT) : idFrom(String(input.questionFr ?? ''), chapterId)
  await getPool().query(
    `INSERT INTO exercises (id, chapter_id, difficulty, duration, question, hint, answer, correction, position, published, source, updated_at)
     VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7::jsonb,$8::jsonb,$9,$10,$11, now())
     ON CONFLICT (id) DO UPDATE SET
       chapter_id = EXCLUDED.chapter_id, difficulty = EXCLUDED.difficulty, duration = EXCLUDED.duration,
       question = EXCLUDED.question, hint = EXCLUDED.hint, answer = EXCLUDED.answer, correction = EXCLUDED.correction,
       position = EXCLUDED.position, published = EXCLUDED.published, updated_at = now()`,
    [
      id,
      chapterId,
      int(input.difficulty, 1, 1, 3),
      int(input.duration, 10, 1, 600),
      JSON.stringify(localized(input.question)),
      JSON.stringify(localized(input.hint)),
      JSON.stringify(localized(input.answer)),
      JSON.stringify(localized(input.correction)),
      int(input.position, 0, 0, 9999),
      bool(input.published),
      typeof input.source === 'string' ? input.source.slice(0, 60) : actor,
    ],
  )
  return id
}

export async function upsertSubject(input: Record<string, unknown>) {
  const name = localized(input.name)
  const id = typeof input.id === 'string' && input.id.trim() ? input.id.trim().slice(0, 60) : idFrom(String(input.nameFr ?? name.fr ?? ''), 'matiere')
  await getPool().query(
    `INSERT INTO subjects (id, name, short, position, updated_at) VALUES ($1,$2::jsonb,$3,$4, now())
     ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, short = EXCLUDED.short, position = EXCLUDED.position, updated_at = now()`,
    [id, JSON.stringify(name), String(input.short ?? '').slice(0, 16).toUpperCase(), int(input.position, 0, 0, 999)],
  )
  return id
}

export async function setStreamLink(streamId: string, subjectId: string, coefficient: number, position: number) {
  await getPool().query(
    `INSERT INTO stream_subjects (stream_id, subject_id, coefficient, position, updated_at) VALUES ($1,$2,$3,$4, now())
     ON CONFLICT (stream_id, subject_id) DO UPDATE SET coefficient = EXCLUDED.coefficient, position = EXCLUDED.position, updated_at = now()`,
    [streamId.slice(0, 20), subjectId.slice(0, 60), int(coefficient, 1, 0, 20), int(position, 0, 0, 999)],
  )
}

export async function removeStreamLink(streamId: string, subjectId: string) {
  await getPool().query('DELETE FROM stream_subjects WHERE stream_id = $1 AND subject_id = $2', [streamId, subjectId])
}

export async function upsertCoachTip(input: Record<string, unknown>) {
  const id = typeof input.id === 'string' && input.id.trim() ? input.id.trim().slice(0, 60) : idFrom(String(input.answerFr ?? ''), 'tip')
  const keywords = Array.isArray(input.keywords)
    ? input.keywords.map((k) => String(k).trim().toLowerCase()).filter(Boolean).slice(0, 30)
    : []
  if (!keywords.length) throw new Error('au moins un mot-clé requis')
  await getPool().query(
    `INSERT INTO coach_tips (id, keywords, answer, subject_id, priority, published, updated_at) VALUES ($1,$2,$3::jsonb,$4,$5,$6, now())
     ON CONFLICT (id) DO UPDATE SET keywords = EXCLUDED.keywords, answer = EXCLUDED.answer, subject_id = EXCLUDED.subject_id,
       priority = EXCLUDED.priority, published = EXCLUDED.published, updated_at = now()`,
    [
      id,
      keywords,
      JSON.stringify(localized(input.answer)),
      input.subject_id ? String(input.subject_id).slice(0, 60) : null,
      int(input.priority, 0, 0, 500),
      bool(input.published),
    ],
  )
  return id
}

export async function removeById(table: 'chapters' | 'exercises' | 'subjects' | 'coach_tips' | 'teachers', id: string) {
  // Both names come from this module's own unions, never from user input.
  const key = table === 'teachers' ? 'code' : 'id'
  const result = await getPool().query(`DELETE FROM ${table} WHERE ${key} = $1`, [id])
  return result.rowCount ?? 0
}

export async function setPublished(table: 'chapters' | 'exercises' | 'coach_tips', id: string, published: boolean) {
  await getPool().query(`UPDATE ${table} SET published = $2, updated_at = now() WHERE id = $1`, [id, published])
  // Publier (ou masquer) un cours entraine ses exercices : une fiche sans entraînement ne servirait à rien.
  if (table === 'chapters') await getPool().query('UPDATE exercises SET published = $2, updated_at = now() WHERE chapter_id = $1', [id, published])
}

export async function consoleCatalogue() {
  const pool = getPool()
  const [subjects, links, chapters, exercises, tips, teachers, students] = await Promise.all([
    pool.query('SELECT id, name, short, position FROM subjects ORDER BY position, id'),
    pool.query('SELECT stream_id, subject_id, coefficient, position FROM stream_subjects ORDER BY stream_id, position'),
    pool.query('SELECT * FROM chapters ORDER BY subject_id, position, id'),
    pool.query('SELECT * FROM exercises ORDER BY chapter_id, position, id'),
    pool.query('SELECT * FROM coach_tips ORDER BY priority DESC, id'),
    pool.query('SELECT code, label, subject_ids, active, created_at FROM teachers ORDER BY created_at DESC'),
    pool.query(
      `SELECT s.code, s.device_id, s.teacher_code, s.profile, s.created_at, s.last_seen_at,
              p.streak, p.last_study, p.completed_chapters, p.completed_exercises, p.attempts
       FROM students s LEFT JOIN progress p ON p.student_code = s.code
       ORDER BY s.last_seen_at DESC LIMIT 500`,
    ),
  ])
  return { subjects, links, chapters, exercises, tips, teachers, students }
}
