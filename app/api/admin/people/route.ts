import { NextResponse } from 'next/server'
import { randomBytes } from 'node:crypto'
import { changePin, checkPin, requireAdmin } from '@/lib/admin'
import { getPool, hasDatabase } from '@/lib/db'
import { removeById } from '@/lib/admin-store'

export const runtime = 'nodejs'

// Same readable alphabet as the student codes, prefixed PRF- so a teacher code never looks like a student one.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function newTeacherCode() {
  const bytes = randomBytes(5)
  return `PRF-${Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('')}`
}

const str = (v: unknown, max = 120) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
const subjectList = (v: unknown) =>
  Array.isArray(v) ? Array.from(new Set(v.map((x) => str(x, 60)).filter(Boolean))).slice(0, 40) : []

/**
 * Le personnel de l'app : création/désactivation des codes enseignant, détachement ou remise à zéro
 * d'un élève, et changement du PIN superadmin. Chaque opération passe par le même garde-admin.
 */
export async function POST(request: Request) {
  if (!hasDatabase()) return NextResponse.json({ error: 'base non configurée' }, { status: 503 })
  const denied = await requireAdmin(request)
  if (denied) return denied

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  const op = str(body?.op, 40)
  const pool = getPool()

  try {
    if (op === 'teacher.create') {
      const label = str(body?.label, 80)
      if (!label) return NextResponse.json({ error: 'nom du professeur requis' }, { status: 400 })
      const subjects = subjectList(body?.subjectIds)
      for (let i = 0; i < 5; i += 1) {
        const code = newTeacherCode()
        try {
          await pool.query(
            `INSERT INTO teachers (code, label, subject_ids, active, created_at) VALUES ($1,$2,$3, true, now())
             ON CONFLICT (code) DO NOTHING`,
            [code, label, subjects],
          )
          const created = await pool.query('SELECT code, label, subject_ids, active, created_at FROM teachers WHERE code = $1', [code])
          if (created.rows.length) return NextResponse.json({ ok: true, teacher: created.rows[0] })
        } catch (error) {
          const failure = error as { code?: string }
          if (failure?.code !== '23505') throw error
        }
      }
      return NextResponse.json({ error: 'impossible de générer un code, réessaie' }, { status: 500 })
    }

    if (op === 'teacher.update') {
      const code = str(body?.code, 20)
      const label = str(body?.label, 80)
      if (!code || !label) return NextResponse.json({ error: 'code et nom requis' }, { status: 400 })
      await pool.query(
        `UPDATE teachers SET label = $2, subject_ids = $3, active = $4 WHERE code = $1`,
        [code, label, subjectList(body?.subjectIds), body?.active !== false],
      )
      return NextResponse.json({ ok: true })
    }

    if (op === 'teacher.delete') {
      const code = str(body?.code, 20)
      if (!code) return NextResponse.json({ error: 'code requis' }, { status: 400 })
      // Les élèves gardent leur code et toute leur progression : ils perdent seulement le rattachement.
      await pool.query('UPDATE students SET teacher_code = NULL WHERE teacher_code = $1', [code])
      const removed = await removeById('teachers', code)
      return NextResponse.json({ ok: true, removed })
    }

    if (op === 'student.reassign') {
      const code = str(body?.code, 20)
      const teacher = str(body?.teacherCode, 20) || null
      if (!code) return NextResponse.json({ error: 'code élève requis' }, { status: 400 })
      if (teacher) {
        const ok = await pool.query('SELECT code FROM teachers WHERE code = $1', [teacher])
        if (!ok.rows.length) return NextResponse.json({ error: 'code enseignant inconnu' }, { status: 400 })
      }
      await pool.query('UPDATE students SET teacher_code = $2 WHERE code = $1', [code, teacher])
      return NextResponse.json({ ok: true })
    }

    if (op === 'student.reset') {
      const code = str(body?.code, 20)
      if (!code) return NextResponse.json({ error: 'code élève requis' }, { status: 400 })
      await pool.query('DELETE FROM progress WHERE student_code = $1', [code])
      return NextResponse.json({ ok: true })
    }

    if (op === 'student.unlink') {
      const code = str(body?.code, 20)
      if (!code) return NextResponse.json({ error: 'code élève requis' }, { status: 400 })
      await pool.query('UPDATE progress SET student_code = NULL WHERE student_code = $1', [code])
      await pool.query('DELETE FROM students WHERE code = $1', [code])
      return NextResponse.json({ ok: true })
    }

    if (op === 'pin.change') {
      const current = str(body?.current, 20)
      const next = str(body?.next, 20)
      if (!/^\d{4,8}$/.test(next)) return NextResponse.json({ error: 'le nouveau PIN doit contenir 4 à 8 chiffres' }, { status: 400 })
      const { checkPin } = await import('@/lib/admin')
      if (!(await checkPin(current))) return NextResponse.json({ error: 'PIN actuel incorrect' }, { status: 403 })
      await changePin(next)
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: `op inconnue: ${op}` }, { status: 400 })
  } catch (error) {
    console.error('POST /api/admin/people failed', error)
    return NextResponse.json({ error: 'server error' }, { status: 500 })
  }
}
