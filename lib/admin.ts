import { createHmac, pbkdf2Sync, randomBytes, timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { getPool } from './db'

export const ADMIN_COOKIE = 'pbadmin'
export const TEACHER_COOKIE = 'pbteacher'
const SESSION_HOURS = 12

/**
 * The PIN is only a casual gate (the client asked for 7777), so it is stored hashed with a random
 * salt and the login route is rate limited. The session token itself is an HMAC over
 * `role|expiry` keyed by a secret generated once and kept in app_settings: rotating that row
 * disconnects every open console without touching the deployment.
 */
const DEFAULT_PIN = '7777'

async function setting(key: string): Promise<string | null> {
  const rows = await getPool().query('SELECT value FROM app_settings WHERE key = $1', [key])
  return rows.rows[0]?.value ?? null
}

async function putSetting(key: string, value: string) {
  await getPool().query(
    `INSERT INTO app_settings (key, value, updated_at) VALUES ($1, $2, now())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
    [key, value],
  )
}

const hashPin = (pin: string, salt: string) =>
  `pbkdf2$${salt}$${pbkdf2Sync(pin, salt, 100_000, 32, 'sha256').toString('hex')}`

export async function ensureAdminPin(pin: string = DEFAULT_PIN) {
  const existing = await setting('admin_pin')
  if (existing) return false
  const salt = randomBytes(12).toString('hex')
  await putSetting('admin_pin', hashPin(pin, salt))
  return true
}

export async function checkPin(pin: string): Promise<boolean> {
  await ensureAdminPin()
  const stored = await setting('admin_pin')
  if (!stored) return false
  const [algorithm, salt, digest] = stored.split('$')
  if (algorithm !== 'pbkdf2' || !salt || !digest) return false
  const candidate = hashPin(pin, salt)
  const a = Buffer.from(candidate)
  const b = Buffer.from(`${algorithm}$${salt}$${digest}`)
  return a.length === b.length && timingSafeEqual(a, b)
}

export async function changePin(next: string): Promise<void> {
  const salt = randomBytes(12).toString('hex')
  await putSetting('admin_pin', hashPin(next, salt))
}

async function signingKey(): Promise<string> {
  const existing = await setting('session_key')
  if (existing) return existing
  const created = randomBytes(32).toString('hex')
  await putSetting('session_key', created)
  return created
}

const sign = (payload: string, key: string) => createHmac('sha256', key).update(payload).digest('hex')

export async function issueToken(role: 'admin' | 'teacher', label = ''): Promise<string> {
  const key = await signingKey()
  const expires = Date.now() + SESSION_HOURS * 3600_000
  const payload = `${role}.${label}.${expires}`
  return `${payload}.${sign(payload, key)}`
}

export async function readToken(token: string | undefined, role: 'admin' | 'teacher'): Promise<{ ok: boolean; label: string }> {
  if (!token) return { ok: false, label: '' }
  const key = await signingKey()
  const parts = token.split('.')
  if (parts.length !== 4) return { ok: false, label: '' }
  const [tokenRole, label, expiresText, signature] = parts
  const payload = `${tokenRole}.${label}.${expiresText}`
  const expected = Buffer.from(sign(payload, key))
  const given = Buffer.from(signature)
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return { ok: false, label: '' }
  if (tokenRole !== role) return { ok: false, label: '' }
  if (!Number.isFinite(Number(expiresText)) || Number(expiresText) < Date.now()) return { ok: false, label: '' }
  return { ok: true, label }
}

export const sessionCookieOptions = () => ({
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: true,
  path: '/',
  maxAge: SESSION_HOURS * 3600,
})

export function cookieOptionsFor(name: string) {
  return { name, ...sessionCookieOptions() }
}

/** Guard used by every /api/admin route. */
export async function requireAdmin(request: Request): Promise<Response | null> {
  const token = readCookie(request, ADMIN_COOKIE)
  const session = await readToken(token, 'admin')
  if (session.ok) return null
  return NextResponse.json({ error: 'admin session required' }, { status: 401 })
}

export function readCookie(request: Request, name: string): string | undefined {
  const header = request.headers.get('cookie') ?? ''
  for (const part of header.split(/;\s*/)) {
    const index = part.indexOf('=')
    if (index < 0) continue
    if (part.slice(0, index) === name) return decodeURIComponent(part.slice(index + 1))
  }
  return undefined
}

/** Very small best-effort throttle: 10 PIN attempts per IP per 15 minutes, per instance. */
const attempts = new Map<string, { count: number; resetAt: number }>()

export function throttle(key: string, limit = 10, windowMs = 15 * 60_000): boolean {
  const now = Date.now()
  const entry = attempts.get(key)
  if (!entry || entry.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  entry.count += 1
  return entry.count <= limit
}
