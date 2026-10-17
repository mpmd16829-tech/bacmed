import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { extractText } from '@/lib/extract'
import { parseDraft } from '@/lib/parse-draft'
import { upsertChapter, upsertExercise } from '@/lib/admin-store'
import { hasDatabase } from '@/lib/db'

export const runtime = 'nodejs'

const MAX_BYTES = 4 * 1024 * 1024 // Vercel limits a function body to 4,5 MB; stay under it.
const MAX_CHAPTERS = 60
const MAX_EXERCISES = 300

/**
 * POST multipart (file)  -> text extracted and split into a draft, nothing written yet.
 * POST json {chapters}   -> the (possibly edited) draft is written as unpublished chapters.
 */
export async function POST(request: Request) {
  const denied = await requireAdmin(request)
  if (denied) return denied
  if (!hasDatabase()) return NextResponse.json({ error: 'base non configurée' }, { status: 503 })

  const contentType = request.headers.get('content-type') ?? ''

  try {
    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData()
      const file = form.get('file')
      if (!(file instanceof File)) return NextResponse.json({ error: 'aucun fichier reçu' }, { status: 400 })
      if (file.size === 0) return NextResponse.json({ error: 'fichier vide' }, { status: 400 })
      if (file.size > MAX_BYTES) {
        return NextResponse.json({ error: `fichier trop lourd (${(file.size / 1024 / 1024).toFixed(1)} Mo, max 4 Mo)` }, { status: 413 })
      }
      const bytes = new Uint8Array(await file.arrayBuffer())
      const extracted = await extractText(file.name, bytes)
      if (extracted.kind === 'unsupported') {
        return NextResponse.json({ kind: 'unsupported', filename: file.name, note: extracted.note })
      }
      const text = extracted.text.slice(0, 400_000)
      const draft = parseDraft(text)
      const chapters = draft.chapters.slice(0, MAX_CHAPTERS)
      const exerciseCount = chapters.reduce((total, chapter) => total + chapter.exercises.length, 0)
      return NextResponse.json({
        kind: 'draft',
        filename: file.name,
        pages: extracted.pages,
        characters: text.length,
        skipped: draft.skipped,
        truncated: draft.chapters.length > chapters.length || exerciseCount > MAX_EXERCISES,
        stats: { chapters: chapters.length, exercises: exerciseCount },
        chapters: chapters.map((chapter) => ({
          ...chapter,
          exercises: chapter.exercises.slice(0, 40),
        })),
      })
    }

    const body = (await request.json().catch(() => null)) as { subject_id?: string; chapters?: unknown[] } | null
    const subjectId = typeof body?.subject_id === 'string' ? body.subject_id.trim() : ''
    if (!subjectId || !Array.isArray(body?.chapters) || !body.chapters.length) {
      return NextResponse.json({ error: 'subject_id et chapters requis' }, { status: 400 })
    }

    let chapters = 0
    let exercises = 0
    for (const raw of body.chapters.slice(0, MAX_CHAPTERS)) {
      const chapter = (raw ?? {}) as Record<string, unknown>
      const chapterId = await upsertChapter(
        {
          subject_id: subjectId,
          title: chapter.title,
          summary: chapter.summary,
          essentials: chapter.essentials,
          prerequisites: chapter.prerequisites,
          objectives: chapter.objectives,
          method: chapter.method,
          mistakes: chapter.mistakes,
          example: chapter.example,
          recap: chapter.recap,
          duration: 40,
          position: chapters,
          published: false,
          source: 'import',
        },
        'import',
      )
      chapters += 1
      const list = Array.isArray(chapter.exercises) ? (chapter.exercises as Record<string, unknown>[]) : []
      for (const [index, rawExercise] of list.slice(0, MAX_EXERCISES).entries()) {
        await upsertExercise(
          {
            chapter_id: chapterId,
            question: rawExercise.question,
            hint: rawExercise.hint,
            answer: rawExercise.answer,
            correction: rawExercise.correction ?? rawExercise.answer,
            difficulty: rawExercise.difficulty ?? 1,
            duration: rawExercise.duration ?? 10,
            position: index,
            published: false,
            source: 'import',
          },
          'import',
        )
        exercises += 1
      }
    }
    return NextResponse.json({ ok: true, chapters, exercises, published: false })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'server error'
    console.error('POST /api/admin/import failed', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
