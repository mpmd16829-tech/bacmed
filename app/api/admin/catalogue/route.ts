import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import {
  consoleCatalogue,
  removeById,
  setPublished,
  setStreamLink,
  removeStreamLink,
  upsertChapter,
  upsertCoachTip,
  upsertExercise,
  upsertSubject,
} from '@/lib/admin-store'
import { hasDatabase } from '@/lib/db'

export const runtime = 'nodejs'

const TABLES = ['chapters', 'exercises', 'subjects', 'coach_tips', 'teachers'] as const

/** The console sees everything, including unpublished drafts, which the student API hides. */
export async function GET(request: Request) {
  const denied = await requireAdmin(request)
  if (denied) return denied
  if (!hasDatabase()) return NextResponse.json({ error: 'base non configurée' }, { status: 503 })
  try {
    const data = await consoleCatalogue()
    return NextResponse.json({
      subjects: data.subjects.rows,
      links: data.links.rows,
      chapters: data.chapters.rows,
      exercises: data.exercises.rows,
      tips: data.tips.rows,
      teachers: data.teachers.rows,
      students: data.students.rows.map((row: Record<string, unknown>) => ({
        code: row.code,
        deviceId: row.device_id,
        teacherCode: row.teacher_code,
        profile: row.profile,
        streak: row.streak ?? 0,
        lastStudy: row.last_study,
        chapters: Array.isArray(row.completed_chapters) ? (row.completed_chapters as string[]).length : 0,
        exercisesDone: Array.isArray(row.completed_exercises) ? (row.completed_exercises as string[]).length : 0,
        reviews: Object.values((row.attempts ?? {}) as Record<string, string>).filter((v) => v === 'review').length,
        seenAt: row.last_seen_at,
      })),
    })
  } catch (error) {
    console.error('GET /api/admin/catalogue failed', error)
    return NextResponse.json({ error: 'server error' }, { status: 500 })
  }
}

type Body = { op?: string; [key: string]: unknown }

/** One entry point for every catalogue edit, so the guard and the auditing stay in a single place. */
export async function POST(request: Request) {
  const denied = await requireAdmin(request)
  if (denied) return denied
  const body = (await request.json().catch(() => null)) as Body | null
  if (!body?.op) return NextResponse.json({ error: 'op required' }, { status: 400 })

  try {
    switch (body.op) {
      case 'chapter.upsert':
        return NextResponse.json({ ok: true, id: await upsertChapter((body.chapter ?? {}) as Record<string, unknown>, 'console') })
      case 'exercise.upsert':
        return NextResponse.json({ ok: true, id: await upsertExercise((body.exercise ?? {}) as Record<string, unknown>, 'console') })
      case 'subject.upsert':
        return NextResponse.json({ ok: true, id: await upsertSubject((body.subject ?? {}) as Record<string, unknown>) })
      case 'link.set':
        await setStreamLink(String(body.stream_id), String(body.subject_id), Number(body.coefficient), Number(body.position ?? 0))
        return NextResponse.json({ ok: true })
      case 'link.remove':
        await removeStreamLink(String(body.stream_id), String(body.subject_id))
        return NextResponse.json({ ok: true })
      case 'publish':
        if (!['chapters', 'exercises', 'coach_tips'].includes(String(body.table))) return NextResponse.json({ error: 'table invalide' }, { status: 400 })
        await setPublished(body.table as 'chapters' | 'exercises' | 'coach_tips', String(body.id), Boolean(body.published))
        return NextResponse.json({ ok: true })
      case 'tip.upsert':
        return NextResponse.json({ ok: true, id: await upsertCoachTip((body.tip ?? {}) as Record<string, unknown>) })
      case 'delete': {
        const table = String(body.table) as (typeof TABLES)[number]
        if (!TABLES.includes(table)) return NextResponse.json({ error: 'table invalide' }, { status: 400 })
        const removed = await removeById(table, String(body.id))
        return NextResponse.json({ ok: true, removed })
      }
      default:
        return NextResponse.json({ error: `op inconnue: ${body.op}` }, { status: 400 })
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'server error'
    console.error('POST /api/admin/catalogue failed', message)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
