'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertCircle, BookOpen, GraduationCap, Loader, LogOut, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import type { Locale } from '@/lib/i18n'
import { tr, type AdminKey } from '@/lib/strings-admin'

type Student = {
  code: string
  name: string
  stream: string
  minutes: number
  streak: number
  lastStudy: string
  lastSeen: string
  chaptersDone: number
  exercisesDone: number
  value: number
  subjects: { id: string; name: string; done: number; total: number; pct: number }[]
  reviews: { id: string; title: string; subject: string }[]
}

type Payload = { teacher: { code: string; label: string }; students: Student[]; totals?: { students: number; chapters: number } }

/** L'espace enseignant : connexion par code PRF-…, puis la classe vue par matière et par point faible. */
export function TeacherSpace() {
  const [locale, setLocale] = useState<Locale>('fr')
  const [state, setState] = useState<'unknown' | 'out' | 'in'>('unknown')
  const [code, setCode] = useState('')
  const [data, setData] = useState<Payload | null>(null)
  const [error, setError] = useState('')
  const [open, setOpen] = useState<string | null>(null)

  const T = useCallback((key: AdminKey) => tr(locale, key), [locale])

  const load = useCallback(async () => {
    const res = await fetch('/api/teacher/students')
    if (res.status === 401) {
      setState('out')
      return
    }
    if (res.ok) {
      setData((await res.json()) as Payload)
      setState('in')
    } else setError(await res.text())
  }, [])

  useEffect(() => {
    fetch('/api/teacher/session')
      .then((r) => r.json())
      .then((json: { teacher?: boolean }) => (json?.teacher ? load() : setState('out')))
      .catch(() => setState('out'))
  }, [load])

  const signIn = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    const res = await fetch('/api/teacher/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    }).catch(() => null)
    if (!res?.ok) {
      setError(T('badTeacher'))
      return
    }
    await load()
  }

  const signOut = () => {
    void fetch('/api/teacher/session', { method: 'DELETE' }).then(() => setState('out'))
    setData(null)
  }

  const counts = useMemo(() => {
    const list = data?.students ?? []
    return {
      students: list.length,
      active: list.filter((s) => s.lastStudy).length,
      weak: list.reduce((n, s) => n + s.reviews.length, 0),
    }
  }, [data])

  return (
    <main dir={locale === 'ar' ? 'rtl' : 'ltr'} className="min-h-screen bg-background px-4 py-8 text-foreground">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <header className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <GraduationCap className="size-5" />
            </span>
            <div>
              <p className="font-serif text-lg font-bold">PrépaBAC · {T('profSpace')}</p>
              <p className="text-xs text-muted-foreground">{data?.teacher?.label || 'Mauritanie'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setLocale(locale === 'fr' ? 'ar' : 'fr')}>
              {locale === 'fr' ? 'العربية' : 'FR'}
            </Button>
            <Button variant="outline" size="sm" onClick={signOut} disabled={state !== 'in'}>
              <LogOut data-icon="inline-start" /> {T('logout')}
            </Button>
            <a className="text-sm underline" href="/">
              {T('backApp')}
            </a>
          </div>
        </header>

        {error && (
          <p className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="size-4" /> {error}
          </p>
        )}

        {state === 'unknown' && (
          <p className="flex items-center gap-2 text-muted-foreground">
            <Loader className="size-4 animate-spin" /> PrépaBAC
          </p>
        )}

        {state === 'out' && (
          <Card className="mx-auto max-w-md">
            <CardHeader>
              <CardTitle>{T('profSpace')}</CardTitle>
              <CardDescription>{T('profLogin')}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={signIn} className="flex flex-col gap-3">
                <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="PRF-XXXXX" autoComplete="off" />
                <Button type="submit">{T('enter')}</Button>
              </form>
            </CardContent>
          </Card>
        )}

        {state === 'in' && data && (
          <>
            <section className="grid gap-3 sm:grid-cols-3">
              <Stat icon={<Users className="size-4" />} v={counts.students} l={T('students')} />
              <Stat icon={<BookOpen className="size-4" />} v={counts.active} l={T('lastSeen')} />
              <Stat icon={<AlertCircle className="size-4" />} v={counts.weak} l={T('weakPoints')} />
            </section>

            {!data.students.length && <p className="text-sm text-muted-foreground">{T('emptyClass')}</p>}

            {data.students.map((student) => (
              <Card key={student.code}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
                    <span>
                      <b className="font-mono">{student.code}</b>
                      {student.name && <span className="ms-2 font-normal">{student.name}</span>}
                      <Badge variant="secondary" className="ms-2">{student.stream}</Badge>
                    </span>
                    <span className="flex items-center gap-2 text-xs text-muted-foreground">
                      {T('value')} {student.value}% · {student.chaptersDone} {T('chaptersCount')} · {student.exercisesDone} {T('exercisesCount')}
                    </span>
                  </CardTitle>
                  <CardDescription>
                    {T('lastSeen')}: {student.lastSeen ? new Date(student.lastSeen).toLocaleDateString() : '—'} · {T('streakLabel')} {student.streak}
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-2">
                  <Progress value={student.value} />
                  <div className="flex flex-wrap gap-2 text-xs">
                    {student.subjects.map((s) => (
                      <span key={s.id} className="rounded-lg border bg-muted/40 px-2 py-1">
                        {s.name} · {s.done}/{s.total}
                      </span>
                    ))}
                  </div>
                  {student.reviews.length > 0 && (
                    <button className="text-start text-xs underline" onClick={() => setOpen(open === student.code ? null : student.code)}>
                      {T('weakPoints')} ({student.reviews.length})
                    </button>
                  )}
                  {open === student.code && (
                    <ul className="mt-1 grid gap-1 text-xs text-muted-foreground">
                      {student.reviews.map((r) => (
                        <li key={r.id} className="truncate">
                          {r.subject ? `${r.subject} · ` : ''}
                          {r.title}
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            ))}
          </>
        )}
      </div>
    </main>
  )
}

function Stat({ icon, v, l }: { icon: React.ReactNode; v: number; l: string }) {
  return (
    <Card>
      <CardContent className={cn('flex items-center justify-between gap-2 p-4')}>
        <span className="text-sm text-muted-foreground">{l}</span>
        <b className="flex items-center gap-2 text-2xl">
          {icon}
          {v}
        </b>
      </CardContent>
    </Card>
  )
}
