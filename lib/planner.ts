import type { Subject } from './bac-data'
import type { Locale } from './i18n'
import { pick } from './i18n'

export type StudySession = {
  id: string
  day: string
  subjectId: string
  subject: string
  title: string
  chapterId: string
  duration: number
  type: 'course' | 'exercise'
  done: boolean
}

const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

const dayLabels: Record<Locale, string[]> = {
  fr: days,
  ar: ['ن', 'ث', 'ر', 'خ', 'ج', 'س', 'ح'],
}

/** Display label for a plan day (Arabic uses single-letter weekday abbreviations). */
export const dayLabel = (day: string, locale: Locale = 'fr') => {
  const i = days.indexOf(day)
  return i < 0 ? day : dayLabels[locale][i]
}

/** 'Lun'..'Dim' for the current local date (Monday-first week). */
export function todayDay(): string {
  const idx = (new Date().getDay() + 6) % 7
  return days[idx]
}

/**
 * One week of sessions: `sessionsPerDay` slots per day (1 under 45 min, 2 under 90, 3 above),
 * each slot lasting `minutes / sessionsPerDay` so the daily total matches what the student chose.
 * Subjects and chapters rotate independently so the same chapter is not repeated two days in a row.
 */
export function generatePlan(
  subjects: Subject[],
  minutes: number,
  completed: string[] = [],
  locale: Locale = 'fr',
): StudySession[] {
  if (!subjects.length) return []
  const slotsPerDay = minutes < 45 ? 1 : minutes < 90 ? 2 : 3
  const duration = Math.max(10, Math.round(minutes / slotsPerDay / 5) * 5)
  const flat = subjects.flatMap((s) => s.chapters.map((c) => ({ subject: s, chapter: c })))
  if (!flat.length) return []

  return days.flatMap((day, d) =>
    Array.from({ length: slotsPerDay }, (_, slot) => {
      const index = d * slotsPerDay + slot
      const { subject, chapter } = flat[index % flat.length]
      const type: StudySession['type'] = index % 2 === 0 ? 'course' : 'exercise'
      const id = `${day}-${slot}-${subject.id}-${chapter.id}`
      return {
        id,
        day,
        subjectId: subject.id,
        subject: pick(subject.name, locale),
        title: pick(chapter.title, locale),
        chapterId: chapter.id,
        duration,
        type,
        done: completed.includes(id),
      }
    }),
  )
}
