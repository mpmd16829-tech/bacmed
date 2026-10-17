import type { Exercise } from './bac-data'
import type { Localized } from './i18n'

export type LocalizedList = Localized[]

export type ChapterRow = {
  id: string
  subject_id: string
  title: Localized
  summary: Localized
  duration: number
  prerequisites: LocalizedList
  objectives: LocalizedList
  essentials: LocalizedList
  method: LocalizedList
  example: Localized
  mistakes: LocalizedList
  recap: Localized
  position: number
  published: boolean
  source: string
  exercises?: Exercise[]
}

export type SubjectRow = {
  id: string
  name: Localized
  short: string
  coefficient: number
  position: number
  chapters: ChapterRow[]
}

export type ContentPayload = {
  version: number
  streams: { id: string; subjects: SubjectRow[] }[]
}

/** Postgres jsonb can hold anything; these guards keep a bad row from breaking the client bundle. */
export const asText = (v: unknown): string => (typeof v === 'string' ? v : '')

export const asLocalized = (v: unknown): Localized => {
  if (!v || typeof v !== 'object') return { fr: '', ar: '' }
  const o = v as Record<string, unknown>
  return { fr: asText(o.fr), ar: asText(o.ar) }
}

export const asLocalizedList = (v: unknown): LocalizedList =>
  Array.isArray(v) ? v.map(asLocalized).filter((x) => x.fr || x.ar) : []

export const asInt = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.trunc(v) : fallback)

/** The API contract shared by /api/content, the console and the client cache. */
export type ContentResponse = {
  version: number
  streams: Record<string, SubjectRow[]>
  coach: CoachTipRow[]
}

export type CoachTipRow = {
  id: string
  keywords: string[]
  answer: Localized
  subject_id: string | null
  priority: number
  published: boolean
}

export const chapterFromRow = (row: ChapterRow, exercises: Exercise[] = []): Exercise[] => exercises

/** Les cinq filières du BAC mauritanien, avec leur libellé bilingue, pour les sélecteurs de la console. */
export const STREAM_LABELS: { id: string; label: Localized }[] = [
  { id: 'C', label: { fr: 'Série C', ar: 'شعبة الرياضيات' } },
  { id: 'D', label: { fr: 'Série D', ar: 'شعبة العلوم الطبيعية' } },
  { id: 'LM', label: { fr: 'Lettres modernes', ar: 'الآداب العصرية' } },
  { id: 'LO', label: { fr: 'Lettres originelles', ar: 'الآداب الأصلية' } },
  { id: 'TMGM', label: { fr: 'Technique', ar: 'الشعبة التقنية' } },
]
