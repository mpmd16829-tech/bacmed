import { NextResponse } from 'next/server'
import { ADMIN_COOKIE, checkPin, cookieOptionsFor, issueToken, readCookie, readToken, throttle } from '@/lib/admin'

export const runtime = 'nodejs'

/** Status of the console session — the hidden logo gesture and /admin both call this. */
export async function GET(request: Request) {
  try {
    const session = await readToken(readCookie(request, ADMIN_COOKIE), 'admin')
    return NextResponse.json({ admin: session.ok })
  } catch (error) {
    console.error('GET /api/admin/session failed', error)
    return NextResponse.json({ admin: false, error: 'server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    if (!throttle(`admin:${ip}`)) {
      return NextResponse.json({ error: 'trop de tentatives, réessaie dans 15 minutes' }, { status: 429 })
    }
    const body = (await request.json().catch(() => null)) as { pin?: unknown } | null
    const pin = typeof body?.pin === 'string' ? body.pin.trim() : ''
    if (!/^\d{4,8}$/.test(pin)) return NextResponse.json({ error: 'PIN invalide' }, { status: 400 })
    if (!(await checkPin(pin))) return NextResponse.json({ error: 'PIN incorrect' }, { status: 401 })

    const response = NextResponse.json({ ok: true })
    response.cookies.set({ ...cookieOptionsFor(ADMIN_COOKIE), value: await issueToken('admin', 'console') })
    return response
  } catch (error) {
    console.error('POST /api/admin/session failed', error)
    return NextResponse.json({ error: 'server error' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const response = NextResponse.json({ ok: true })
  response.cookies.set({ ...cookieOptionsFor(ADMIN_COOKIE), value: '', maxAge: 0 })
  void request
  return response
}
