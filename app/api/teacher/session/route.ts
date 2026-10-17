import { NextResponse } from 'next/server'
import { TEACHER_COOKIE, cookieOptionsFor, issueToken, readCookie, readToken, throttle } from '@/lib/admin'
import { getPool, hasDatabase } from '@/lib/db'

export const runtime = 'nodejs'

/**
 * A teacher signs in with the code the superadmin created for them (no password, no account).
 * The code itself is written into the signed token, so every later request knows whose class to show.
 */
export async function POST(request: Request) {
  if (!hasDatabase()) return NextResponse.json({ error: 'base non configurée' }, { status: 503 })
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    if (!throttle(`teacher:${ip}`)) {
      return NextResponse.json({ error: 'trop de tentatives, réessaie dans 15 minutes' }, { status: 429 })
    }
    const body = (await request.json().catch(() => null)) as { code?: unknown } | null
    const code = typeof body?.code === 'string' ? body.code.trim().toUpperCase().slice(0, 20) : ''
    if (!code) return NextResponse.json({ error: 'code requis' }, { status: 400 })

    const found = await getPool().query('SELECT code, label, subject_ids FROM teachers WHERE code = $1 AND active', [code])
    if (!found.rows.length) return NextResponse.json({ error: 'code enseignant inconnu ou désactivé' }, { status: 401 })
    const teacher = found.rows[0] as Record<string, unknown>

    const response = NextResponse.json({ ok: true, label: teacher.label, subjectIds: teacher.subject_ids ?? [] })
    response.cookies.set({ ...cookieOptionsFor(TEACHER_COOKIE), value: await issueToken('teacher', code) })
    return response
  } catch (error) {
    console.error('POST /api/teacher/session failed', error)
    return NextResponse.json({ error: 'server error' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const session = await readToken(readCookie(request, TEACHER_COOKIE), 'teacher')
    return NextResponse.json({ teacher: session.ok, code: session.label })
  } catch (error) {
    console.error('GET /api/teacher/session failed', error)
    return NextResponse.json({ teacher: false, error: 'server error' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const response = NextResponse.json({ ok: true })
  response.cookies.set({ ...cookieOptionsFor(TEACHER_COOKIE), value: '', maxAge: 0 })
  void request
  return response
}
