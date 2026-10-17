'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertCircle, Check, Cloud, Download, Loader, Lock, Plus, RefreshCw, Sparkles, Trash2, Upload, Users, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import type { Localized, Locale } from '@/lib/i18n'
import { tr, type AdminKey } from '@/lib/strings-admin'
import { STREAM_LABELS } from '@/lib/content-types'

export type AdminConsoleProps = { onClose?: () => void; startTab?: Tab; initialLocale?: Locale }
export type Tab = 'courses' | 'exercises' | 'import' | 'coach' | 'people' | 'settings'

type Row = Record<string, unknown>
type Catalogue = { subjects: Row[]; links: Row[]; chapters: Row[]; exercises: Row[]; tips: Row[]; teachers: Row[]; students: Row[] }

type Mutate = (payload: Record<string, unknown>, path?: string, done?: string) => Promise<void>

const EMPTY: Catalogue = { subjects: [], links: [], chapters: [], exercises: [], tips: [], teachers: [], students: [] }

const loc = (v: unknown): Localized => {
  const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>
  return { fr: typeof o.fr === 'string' ? o.fr : '', ar: typeof o.ar === 'string' ? o.ar : '' }
}
const list = (v: unknown): Localized[] => (Array.isArray(v) ? v.map(loc) : [])
const text = (v: unknown, max = 90, pref?: Locale) => {
  const l = loc(v)
  return (pref === 'ar' ? l.ar || l.fr : l.fr || l.ar).slice(0, max)
}
const str = (v: unknown) => (typeof v === 'string' ? v : '')
const num = (v: unknown, fallback = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback)

/** Zip two line-per-language textareas back into localized items. */
const zipLines = (fr: string, ar: string): Localized[] => {
  const a = fr.split('\n').map((s) => s.trim())
  const b = ar.split('\n').map((s) => s.trim())
  const n = Math.max(a.filter(Boolean).length, b.filter(Boolean).length)
  if (n === 0) return []
  return Array.from({ length: Math.max(a.length, b.length) }, (_, i) => ({ fr: a[i] ?? '', ar: b[i] ?? '' })).filter((x) => x.fr || x.ar)
}
const linesOf = (items: Localized[], lang: 'fr' | 'ar') => items.map((x) => x[lang]).join('\n')

async function api<T = Row[]>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init)
  const json = (await res.json().catch(() => null)) as ({ error?: string } & T) | null
  if (!res.ok || json?.error) throw new Error(json?.error || `HTTP ${res.status}`)
  return json as T
}

const post = (path: string, body: unknown) =>
  api(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

export function AdminConsole({ onClose, startTab = 'courses', initialLocale = 'fr' }: AdminConsoleProps) {
  const [locale, setLocale] = useState<Locale>(initialLocale)
  const [session, setSession] = useState<'unknown' | 'in' | 'out'>('unknown')
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState('')
  const [tab, setTab] = useState<Tab>(startTab)
  const [catalogue, setCatalogue] = useState<Catalogue>(EMPTY)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [failure, setFailure] = useState('')

  const T = useCallback((key: AdminKey) => tr(locale, key), [locale])

  const load = useCallback(async () => {
    try {
      const data = await api<Catalogue>('/api/admin/catalogue')
      setCatalogue({
        subjects: data.subjects ?? [],
        links: data.links ?? [],
        chapters: data.chapters ?? [],
        exercises: data.exercises ?? [],
        tips: data.tips ?? [],
        teachers: data.teachers ?? [],
        students: data.students ?? [],
      })
      setFailure('')
    } catch (error) {
      setFailure(error instanceof Error ? error.message : 'erreur')
    }
  }, [])

  useEffect(() => {
    fetch('/api/admin/session')
      .then((r) => r.json())
      .then((json: { admin?: boolean }) => setSession(json?.admin ? 'in' : 'out'))
      .catch(() => setSession('out'))
  }, [])

  useEffect(() => {
    if (session === 'in') void load()
  }, [session, load])

  /** Une seule sortie d'écritures : chaque mutation replaye la charge utile puis recharge le catalogue. */
  const mutate = useCallback(
    async (payload: Record<string, unknown>, path = '/api/admin/catalogue', done?: string) => {
      setBusy(true)
      setNotice('')
      try {
        await post(path, payload)
        await load()
        if (done) setNotice(done)
      } catch (error) {
        setFailure(error instanceof Error ? error.message : 'erreur')
      } finally {
        setBusy(false)
      }
    },
    [load],
  )

  const signIn = async (event: React.FormEvent) => {
    event.preventDefault()
    setPinError('')
    try {
      await post('/api/admin/session', { pin })
      setSession('in')
      setPin('')
    } catch {
      setPinError(T('badPin'))
    }
  }

  if (session === 'unknown') {
    return (
      <div className="flex min-h-40 items-center justify-center gap-2 text-muted-foreground">
        <Loader className="size-4 animate-spin" /> PrépaBAC
      </div>
    )
  }

  if (session === 'out') {
    return (
      <div dir={locale === 'ar' ? 'rtl' : 'ltr'} className="mx-auto w-full max-w-md p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="size-5" /> {T('pinTitle')}
            </CardTitle>
            <CardDescription>{T('pinText')}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={signIn} className="flex flex-col gap-3">
              <Input value={pin} onChange={(e) => setPin(e.target.value)} inputMode="numeric" autoComplete="off" placeholder="••••" />
              {pinError && <p className="text-sm text-destructive">{pinError}</p>}
              <div className="flex items-center justify-between gap-2">
                <Button type="button" variant="ghost" onClick={() => setLocale(locale === 'fr' ? 'ar' : 'fr')}>
                  {locale === 'fr' ? 'العربية' : 'FR'}
                </Button>
                <div className="flex gap-2">
                  {onClose && (
                    <Button type="button" variant="outline" onClick={onClose}>
                      {T('close')}
                    </Button>
                  )}
                  <Button type="submit">{T('open')}</Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  const tabs: { id: Tab; key: AdminKey }[] = [
    { id: 'courses', key: 'tabCourses' },
    { id: 'exercises', key: 'tabExercises' },
    { id: 'import', key: 'tabImport' },
    { id: 'coach', key: 'tabCoach' },
    { id: 'people', key: 'tabPeople' },
    { id: 'settings', key: 'tabSettings' },
  ]

  return (
    <div dir={locale === 'ar' ? 'rtl' : 'ltr'} className="flex min-h-screen flex-col bg-muted/40 lg:flex-row">
      <aside className="flex shrink-0 flex-col gap-1 border-b bg-card p-4 lg:w-60 lg:border-b-0 lg:border-e">
        <div className="flex items-center justify-between">
          <b className="font-serif text-lg">PrépaBAC</b>
          <Button variant="ghost" size="sm" onClick={() => setLocale(locale === 'fr' ? 'ar' : 'fr')}>
            {locale === 'fr' ? 'العربية' : 'FR'}
          </Button>
        </div>
        <p className="mb-3 text-[10px] uppercase tracking-widest text-muted-foreground">{T('pinTitle')}</p>
        {tabs.map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className={cn('min-h-10 rounded-lg px-3 text-start text-sm', tab === item.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')}
          >
            {T(item.key)}
          </button>
        ))}
        <div className="mt-auto flex flex-col gap-2 pt-4 text-xs text-muted-foreground">
          {busy ? (
            <span className="flex items-center gap-1">
              <Loader className="size-3 animate-spin" /> {T('saving')}
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <Cloud className="size-3" /> {catalogue.chapters.length} {T('chaptersCount')} · {catalogue.exercises.length} {T('exercisesCount')}
            </span>
          )}
          <a className="underline" href="/prof" target="_blank" rel="noreferrer">
            {T('profSpace')}
          </a>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => signOut(setSession)}>
              {T('logout')}
            </Button>
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                {T('close')}
              </Button>
            )}
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto p-4 lg:p-6">
        {notice && (
          <p className="mb-3 flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-sm">
            <Check className="size-4" /> {notice}
          </p>
        )}
        {failure && (
          <p className="mb-3 flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="size-4" /> {failure}
          </p>
        )}

        {tab === 'courses' && <CoursesTab catalogue={catalogue} mutate={mutate} locale={locale} />}
        {tab === 'exercises' && <ExercisesTab catalogue={catalogue} mutate={mutate} locale={locale} />}
        {tab === 'import' && <ImportTab catalogue={catalogue} mutate={mutate} locale={locale} busy={busy} />}
        {tab === 'coach' && <CoachTab catalogue={catalogue} mutate={mutate} locale={locale} />}
        {tab === 'people' && <PeopleTab catalogue={catalogue} mutate={mutate} reload={load} locale={locale} />}
        {tab === 'settings' && <SettingsTab mutate={mutate} locale={locale} />}
      </main>
    </div>
  )
}

function signOut(setSession: (s: 'unknown' | 'in' | 'out') => void) {
  fetch('/api/admin/session', { method: 'DELETE' })
    .then(() => setSession('out'))
    .catch(() => undefined)
}

/* ------------------------------------------------------------------ Cours */

type ChapterDraft = {
  id: string
  subject_id: string
  title: Localized
  summary: Localized
  duration: number
  prerequisites: Localized[]
  objectives: Localized[]
  essentials: Localized[]
  method: Localized[]
  example: Localized
  mistakes: Localized[]
  recap: Localized
  position: number
  published: boolean
}

const emptyChapter = (subjectId: string): ChapterDraft => ({
  id: '',
  subject_id: subjectId,
  title: { fr: '', ar: '' },
  summary: { fr: '', ar: '' },
  duration: 40,
  prerequisites: [],
  objectives: [],
  essentials: [],
  method: [],
  example: { fr: '', ar: '' },
  mistakes: [],
  recap: { fr: '', ar: '' },
  position: 0,
  published: true,
})

const chapterDraft = (row: Row): ChapterDraft => ({
  id: str(row.id),
  subject_id: str(row.subject_id),
  title: loc(row.title),
  summary: loc(row.summary),
  duration: num(row.duration, 40),
  prerequisites: list(row.prerequisites),
  objectives: list(row.objectives),
  essentials: list(row.essentials),
  method: list(row.method),
  example: loc(row.example),
  mistakes: list(row.mistakes),
  recap: loc(row.recap),
  position: num(row.position),
  published: row.published !== false,
})

function CoursesTab({ catalogue, mutate, locale }: { catalogue: Catalogue; mutate: Mutate; locale: Locale }) {
  const T = (key: AdminKey) => tr(locale, key)
  const [subjectFilter, setSubjectFilter] = useState('')
  const [draft, setDraft] = useState<ChapterDraft | null>(null)

  const subjects = catalogue.subjects
  const chapters = useMemo(
    () => catalogue.chapters.filter((c) => !subjectFilter || str(c.subject_id) === subjectFilter),
    [catalogue.chapters, subjectFilter],
  )
  const nameOf = useMemo(() => new Map(subjects.map((s) => [str(s.id), text(s.name, 40, locale)])), [subjects, locale])

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-serif text-2xl font-bold">{T('tabCourses')}</h2>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="min-h-10 rounded-lg border bg-card px-2 text-sm"
          >
            <option value="">{T('subjects')} · {T('allStreams')}</option>
            {subjects.map((s) => (
              <option key={str(s.id)} value={str(s.id)}>
                {text(s.name, 40, locale)}
              </option>
            ))}
          </select>
          <Button size="sm" onClick={() => setDraft(emptyChapter(subjectFilter || str(subjects[0]?.id ?? '')))} disabled={!subjects.length}>
            <Plus data-icon="inline-start" /> {T('addChapter')}
          </Button>
        </div>
      </header>

      <SubjectsCard catalogue={catalogue} mutate={mutate} locale={locale} />

      <div className="grid gap-2">
        {chapters.map((row) => {
          const published = row.published !== false
          return (
            <Card key={str(row.id)}>
              <CardContent className="flex flex-wrap items-center justify-between gap-2 p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {text(row.title, 90, locale)}
                    {!published && <Badge variant="outline" className="ms-2">{T('draft')}</Badge>}
                    {str(row.source) === 'import' && <Badge variant="secondary" className="ms-2"><Upload className="size-3 me-1" />{T('tabImport')}</Badge>}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {nameOf.get(str(row.subject_id))} · {num(row.duration, 40)} min · {list(row.essentials).length} notions
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  <Button variant="outline" size="sm" onClick={() => void mutate({ op: 'publish', table: 'chapters', id: str(row.id), published: !published })}>
                    {published ? T('unpublish') : T('publish')}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setDraft(chapterDraft(row))}>
                    {T('edit')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm(T('confirmDel'))) void mutate({ op: 'delete', table: 'chapters', id: str(row.id) })
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
        {!chapters.length && <p className="text-sm text-muted-foreground">{T('emptyCatalog')}</p>}
      </div>

      {draft && <ChapterEditor draft={draft} setDraft={setDraft} catalogue={catalogue} mutate={mutate} locale={locale} />}
    </div>
  )
}

function SubjectsCard({ catalogue, mutate, locale }: { catalogue: Catalogue; mutate: Mutate; locale: Locale }) {
  const T = (key: AdminKey) => tr(locale, key)
  const [open, setOpen] = useState(false)
  const [name, setName] = useState<Localized>({ fr: '', ar: '' })
  const [short, setShort] = useState('')
  const [links, setLinks] = useState<Record<string, string>>({})

  const add = async () => {
    if (!name.fr && !name.ar) return
    await mutate({ op: 'subject.upsert', subject: { name, short: short.toUpperCase(), position: catalogue.subjects.length } })
    setName({ fr: '', ar: '' })
    setShort('')
    setOpen(false)
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          {T('subjects')} · {catalogue.subjects.length}
          <Button variant="outline" size="sm" onClick={() => setOpen(!open)}>
            {T('addSubject')}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {open && (
          <div className="grid gap-2 rounded-lg border bg-muted/40 p-3 sm:grid-cols-2">
            <Input placeholder={T('fTitle')} value={name.fr} onChange={(e) => setName({ ...name, fr: e.target.value })} />
            <Input placeholder={T('arField')} value={name.ar} onChange={(e) => setName({ ...name, ar: e.target.value })} dir="rtl" />
            <Input placeholder={T('fShort')} value={short} onChange={(e) => setShort(e.target.value)} />
            <Button size="sm" onClick={add}>{T('save')}</Button>
          </div>
        )}
        {catalogue.subjects.map((s) => {
          const id = str(s.id)
          const mine = catalogue.links.filter((l) => str(l.subject_id) === id)
          return (
            <div key={id} className="flex flex-wrap items-center justify-between gap-2 border-b pb-2 text-sm">
              <div className="min-w-0">
                <b>{text(s.name, 90, locale)}</b>
                <span className="ms-2 text-xs text-muted-foreground">{str(s.short)}</span>
                <p className="text-xs text-muted-foreground">
                  {T('linked')}: {mine.length ? mine.map((l) => `${str(l.stream_id)}×${num(l.coefficient, 1)}`).join(' · ') : '—'}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1">
                <select
                  value={links[id] ?? ''}
                  onChange={(e) => setLinks({ ...links, [id]: e.target.value })}
                  className="min-h-9 rounded-md border bg-card px-2 text-xs"
                >
                  <option value="">{T('link')}</option>
                  {STREAM_LABELS.map((st) => (
                    <option key={st.id} value={st.id}>{st.label.fr}</option>
                  ))}
                </select>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const stream = links[id]
                    if (!stream) return
                    void mutate({ op: 'link.set', stream_id: stream, subject_id: id, coefficient: 1, position: mine.length })
                  }}
                >
                  OK
                </Button>
                {mine.map((l) => (
                  <Button key={str(l.stream_id)} size="sm" variant="ghost" onClick={() => void mutate({ op: 'link.remove', stream_id: str(l.stream_id), subject_id: id })}>
                    {str(l.stream_id)} <X className="size-3" />
                  </Button>
                ))}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (confirm(T('confirmDel'))) void mutate({ op: 'delete', table: 'subjects', id })
                  }}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

function Field({ label, value, onValue, area, rtl, type = 'text' }: { label: string; value: string; onValue: (v: string) => void; area?: boolean; rtl?: boolean; type?: string }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium">
      <span className={cn('text-muted-foreground', rtl && 'text-end')}>{label}</span>
      {area ? (
        <Textarea value={value} onChange={(e) => onValue(e.target.value)} dir={rtl ? 'rtl' : 'ltr'} rows={3} />
      ) : (
        <Input value={value} onChange={(e) => onValue(e.target.value)} dir={rtl ? 'rtl' : 'ltr'} type={type} />
      )}
    </label>
  )
}

function LocalizedPair({ label, value, onChange, area }: { label: string; value: Localized; onChange: (v: Localized) => void; area?: boolean }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <Field label={`${label} — FR`} value={value.fr} onValue={(fr) => onChange({ ...value, fr })} area={area} />
      <Field label={`${label} — AR`} value={value.ar} onValue={(ar) => onChange({ ...value, ar })} area={area} rtl />
    </div>
  )
}

function ListPair({ label, items, onChange, locale }: { label: string; items: Localized[]; onChange: (v: Localized[]) => void; locale: Locale }) {
  const [fr, setFr] = useState(() => linesOf(items, 'fr'))
  const [ar, setAr] = useState(() => linesOf(items, 'ar'))
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <Field label={`${label} — FR`} value={fr} onValue={setFr} area />
      <Field label={`${label} — AR`} value={ar} onValue={setAr} area rtl />
      <button className="text-xs underline sm:col-span-2" onClick={() => onChange(zipLines(fr, ar))}>
        {tr(locale, 'applyNow')}
      </button>
    </div>
  )
}

function ChapterEditor({
  draft,
  setDraft,
  catalogue,
  mutate,
  locale,
}: {
  draft: ChapterDraft
  setDraft: (d: ChapterDraft | null) => void
  catalogue: Catalogue
  mutate: Mutate
  locale: Locale
}) {
  const T = (key: AdminKey) => tr(locale, key)
  const [copy, setCopy] = useState<ChapterDraft>(draft)

  const save = async () => {
    if (!copy.title.fr && !copy.title.ar) return
    await mutate({ op: 'chapter.upsert', chapter: copy }, '/api/admin/catalogue', T('saved'))
    setDraft(null)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/50 p-4">
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            {copy.id ? T('edit') : T('addChapter')}
            <Button variant="ghost" size="sm" onClick={() => setDraft(null)}>
              <X className="size-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="flex flex-col gap-1 text-xs font-medium">
              <span className="text-muted-foreground">{T('fSubject')}</span>
              <select value={copy.subject_id} onChange={(e) => setCopy({ ...copy, subject_id: e.target.value })} className="min-h-10 rounded-lg border bg-card px-2">
                {catalogue.subjects.map((s) => (
                  <option key={str(s.id)} value={str(s.id)}>{text(s.name, 40, locale)}</option>
                ))}
              </select>
            </label>
            <Field label={T('fDuration')} value={String(copy.duration)} onValue={(v) => setCopy({ ...copy, duration: Number(v) || 0 })} type="number" />
            <Field label={T('position')} value={String(copy.position)} onValue={(v) => setCopy({ ...copy, position: Number(v) || 0 })} type="number" />
          </div>
          <LocalizedPair label={T('fTitle')} value={copy.title} onChange={(title) => setCopy({ ...copy, title })} />
          <LocalizedPair label={T('fSummary')} value={copy.summary} onChange={(summary) => setCopy({ ...copy, summary })} area />
          <ListPair label={T('fObjectives')} items={copy.objectives} onChange={(objectives) => setCopy({ ...copy, objectives })} locale={locale} />
          <ListPair label={T('fPrerequisites')} items={copy.prerequisites} onChange={(prerequisites) => setCopy({ ...copy, prerequisites })} locale={locale} />
          <ListPair label={T('fEssentials')} items={copy.essentials} onChange={(essentials) => setCopy({ ...copy, essentials })} locale={locale} />
          <ListPair label={T('fMethod')} items={copy.method} onChange={(method) => setCopy({ ...copy, method })} locale={locale} />
          <ListPair label={T('fMistakes')} items={copy.mistakes} onChange={(mistakes) => setCopy({ ...copy, mistakes })} locale={locale} />
          <LocalizedPair label={T('fExample')} value={copy.example} onChange={(example) => setCopy({ ...copy, example })} area />
          <LocalizedPair label={T('fRecap')} value={copy.recap} onChange={(recap) => setCopy({ ...copy, recap })} area />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={copy.published} onChange={(e) => setCopy({ ...copy, published: e.target.checked })} />
            {T('publish')}
          </label>
        </CardContent>
        <div className="flex justify-end gap-2 border-t p-4">
          <Button variant="outline" onClick={() => setDraft(null)}>{T('cancel')}</Button>
          <Button onClick={save} disabled={!copy.subject_id}>{T('save')}</Button>
        </div>
      </Card>
    </div>
  )
}

/* -------------------------------------------------------------- Exercices */

type ExerciseDraft = {
  id: string
  chapter_id: string
  question: Localized
  hint: Localized
  answer: Localized
  correction: Localized
  difficulty: number
  duration: number
  position: number
  published: boolean
}

const exerciseDraft = (row: Row): ExerciseDraft => ({
  id: str(row.id),
  chapter_id: str(row.chapter_id),
  question: loc(row.question),
  hint: loc(row.hint),
  answer: loc(row.answer),
  correction: loc(row.correction),
  difficulty: num(row.difficulty, 1),
  duration: num(row.duration, 10),
  position: num(row.position),
  published: row.published !== false,
})

function ExercisesTab({ catalogue, mutate, locale }: { catalogue: Catalogue; mutate: Mutate; locale: Locale }) {
  const T = (key: AdminKey) => tr(locale, key)
  const [filter, setFilter] = useState('')
  const [draft, setDraft] = useState<ExerciseDraft | null>(null)
  const titleOf = useMemo(() => new Map(catalogue.chapters.map((c) => [str(c.id), text(c.title, 60, locale)])), [catalogue.chapters, locale])
  const rows = catalogue.exercises.filter((e) => !filter || str(e.chapter_id) === filter)

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-serif text-2xl font-bold">{T('tabExercises')}</h2>
        <div className="flex items-center gap-2">
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="min-h-10 rounded-lg border bg-card px-2 text-sm">
            <option value="">{T('fChapter')} · {T('allStreams')}</option>
            {catalogue.chapters.map((c) => (
              <option key={str(c.id)} value={str(c.id)}>{text(c.title, 50, locale)}</option>
            ))}
          </select>
          <Button
            size="sm"
            disabled={!catalogue.chapters.length}
            onClick={() =>
              setDraft({
                id: '',
                chapter_id: filter || str(catalogue.chapters[0]?.id ?? ''),
                question: { fr: '', ar: '' },
                hint: { fr: '', ar: '' },
                answer: { fr: '', ar: '' },
                correction: { fr: '', ar: '' },
                difficulty: 1,
                duration: 10,
                position: 0,
                published: true,
              })
            }
          >
            <Plus data-icon="inline-start" /> {T('addExercise')}
          </Button>
        </div>
      </header>

      {rows.map((row) => {
        const published = row.published !== false
        return (
          <Card key={str(row.id)}>
            <CardContent className="flex flex-wrap items-center justify-between gap-2 p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {text(row.question, 110, locale)}
                  {!published && <Badge variant="outline" className="ms-2">{T('draft')}</Badge>}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {titleOf.get(str(row.chapter_id))} · {num(row.difficulty, 1)}/3 · {num(row.duration, 10)} min
                </p>
              </div>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" onClick={() => void mutate({ op: 'publish', table: 'exercises', id: str(row.id), published: !published })}>
                  {published ? T('unpublish') : T('publish')}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setDraft(exerciseDraft(row))}>{T('edit')}</Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (confirm(T('confirmDel'))) void mutate({ op: 'delete', table: 'exercises', id: str(row.id) })
                  }}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      })}
      {!rows.length && <p className="text-sm text-muted-foreground">{T('emptyCatalog')}</p>}

      {draft && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/50 p-4">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {draft.id ? T('edit') : T('addExercise')}
                <Button variant="ghost" size="sm" onClick={() => setDraft(null)}>
                  <X className="size-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="flex flex-col gap-1 text-xs font-medium">
                  <span className="text-muted-foreground">{T('fChapter')}</span>
                  <select value={draft.chapter_id} onChange={(e) => setDraft({ ...draft, chapter_id: e.target.value })} className="min-h-10 rounded-lg border bg-card px-2">
                    {catalogue.chapters.map((c) => (
                      <option key={str(c.id)} value={str(c.id)}>{text(c.title, 50, locale)}</option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium">
                  <span className="text-muted-foreground">{T('fDifficulty')}</span>
                  <select value={draft.difficulty} onChange={(e) => setDraft({ ...draft, difficulty: Number(e.target.value) })} className="min-h-10 rounded-lg border bg-card px-2">
                    <option value={1}>{T('easy')}</option>
                    <option value={2}>{T('medium')}</option>
                    <option value={3}>{T('hard')}</option>
                  </select>
                </label>
                <Field label={T('fDuration')} value={String(draft.duration)} onValue={(v) => setDraft({ ...draft, duration: Number(v) || 0 })} type="number" />
              </div>
              <LocalizedPair label={T('fQuestion')} value={draft.question} onChange={(question) => setDraft({ ...draft, question })} area />
              <LocalizedPair label={T('fHint')} value={draft.hint} onChange={(hint) => setDraft({ ...draft, hint })} area />
              <LocalizedPair label={T('fAnswer')} value={draft.answer} onChange={(answer) => setDraft({ ...draft, answer })} area />
              <LocalizedPair label={T('fCorrection')} value={draft.correction} onChange={(correction) => setDraft({ ...draft, correction })} area />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={draft.published} onChange={(e) => setDraft({ ...draft, published: e.target.checked })} />
                {T('publish')}
              </label>
            </CardContent>
            <div className="flex justify-end gap-2 border-t p-4">
              <Button variant="outline" onClick={() => setDraft(null)}>{T('cancel')}</Button>
              <Button
                disabled={!draft.chapter_id || (!draft.question.fr && !draft.question.ar)}
                onClick={async () => {
                  await mutate({ op: 'exercise.upsert', exercise: draft }, '/api/admin/catalogue', T('saved'))
                  setDraft(null)
                }}
              >
                {T('save')}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

/* ----------------------------------------------------------------- Import */

type DraftIn = {
  title: Localized
  summary: Localized
  essentials: Localized[]
  exercises: { question: Localized; answer: Localized; correction?: Localized; difficulty?: number; duration?: number }[]
}

function ImportTab({ catalogue, mutate, locale, busy }: { catalogue: Catalogue; mutate: Mutate; locale: Locale; busy: boolean }) {
  const T = (key: AdminKey) => tr(locale, key)
  const [file, setFile] = useState<File | null>(null)
  const [draft, setDraft] = useState<{ filename: string; chapters: DraftIn[] } | null>(null)
  const [subjectId, setSubjectId] = useState('')
  const [note, setNote] = useState('')

  const analyze = async () => {
    setNote('')
    if (!file) return
    const form = new FormData()
    form.append('file', file)
    try {
      const res = await fetch('/api/admin/import', { method: 'POST', body: form })
      const json = (await res.json()) as { kind?: string; note?: string; error?: string; chapters?: DraftIn[]; filename?: string }
      if (json.error) setNote(json.error)
      else if (json.kind === 'unsupported') setNote(`${T('unsupported')} — ${json.note ?? ''}`)
      else if (!json.chapters?.length) setNote(T('nothingToImport'))
      else {
        setDraft({ filename: json.filename ?? file.name, chapters: json.chapters })
        setSubjectId(subjectId || str(catalogue.subjects[0]?.id ?? ''))
      }
    } catch (error) {
      setNote(error instanceof Error ? error.message : 'erreur')
    }
  }

  const commit = async () => {
    if (!draft || !subjectId) return
    await mutate({ subject_id: subjectId, chapters: draft.chapters }, '/api/admin/import', T('imported'))
    setDraft(null)
    setFile(null)
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-serif text-2xl font-bold">{T('tabImport')}</h2>
      <Card>
        <CardHeader>
          <CardDescription>{T('importText')}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          {/* Tout format est accepté : c'est l'extracteur qui décide, et il prévient honnêtement si le fichier est illisible. */}
          <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border bg-card px-3 text-sm font-medium hover:bg-muted">
            <Upload className="size-4" />
            {T('chooseFile')}
            <input type="file" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
          {file && <span className="truncate text-sm text-muted-foreground" dir="ltr">{file.name}</span>}
          <Button onClick={analyze} disabled={!file || busy}>
            <Download data-icon="inline-start" className="rotate-180" /> {T('analyze')}
          </Button>
          {note && <p className="text-sm text-destructive">{note}</p>}
        </CardContent>
      </Card>

      {draft && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{T('preview')} · {draft.filename}</CardTitle>
            <CardDescription>
              {draft.chapters.length} {T('detectedChapters')} · {draft.chapters.reduce((n, c) => n + c.exercises.length, 0)} {T('detectedExercises')}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <label className="flex flex-col gap-1 text-xs font-medium sm:w-64">
              <span className="text-muted-foreground">{T('targetSubject')}</span>
              <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className="min-h-10 rounded-lg border bg-card px-2">
                {catalogue.subjects.map((s) => (
                  <option key={str(s.id)} value={str(s.id)}>{text(s.name, 40, locale)}</option>
                ))}
              </select>
            </label>

            {draft.chapters.map((chapter, index) => (
              <div key={index} className="rounded-lg border bg-card p-3">
                <div className="flex items-center justify-between gap-2">
                  <Input
                    value={chapter.title.fr}
                    onChange={(e) => {
                      const next = [...draft.chapters]
                      next[index] = { ...chapter, title: { ...chapter.title, fr: e.target.value } }
                      setDraft({ ...draft, chapters: next })
                    }}
                    placeholder="Titre FR"
                  />
                  <Input
                    dir="rtl"
                    value={chapter.title.ar}
                    onChange={(e) => {
                      const next = [...draft.chapters]
                      next[index] = { ...chapter, title: { ...chapter.title, ar: e.target.value } }
                      setDraft({ ...draft, chapters: next })
                    }}
                    placeholder="العنوان AR"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDraft({ ...draft, chapters: draft.chapters.filter((_, i) => i !== index) })}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{text(chapter.summary, 120, locale) || text(chapter.essentials[0], 120, locale)}</p>
                <ul className="mt-1 list-inside list-disc text-xs text-muted-foreground">
                  {chapter.exercises.slice(0, 6).map((ex, i) => (
                    <li key={i} className="truncate">{text(ex.question, 90, locale)}</li>
                  ))}
                </ul>
                {chapter.exercises.length > 6 && <p className="text-xs text-muted-foreground">+{chapter.exercises.length - 6}…</p>}
              </div>
            ))}
          </CardContent>
          <div className="flex justify-end gap-2 border-t p-4">
            <Button variant="outline" onClick={() => setDraft(null)}>{T('cancel')}</Button>
            <Button onClick={commit} disabled={!subjectId || busy}>
              <Upload data-icon="inline-start" /> {T('commit')} ({draft.chapters.reduce((n, c) => n + c.exercises.length, 0)} {T('exercisesCount')})
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ Coach */

function CoachTab({ catalogue, mutate, locale }: { catalogue: Catalogue; mutate: Mutate; locale: Locale }) {
  const T = (key: AdminKey) => tr(locale, key)
  const [draft, setDraft] = useState<{ id: string; keywords: string; answer: Localized; subject_id: string; priority: number; published: boolean } | null>(null)

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-serif text-2xl font-bold">{T('tabCoach')}</h2>
          <p className="text-sm text-muted-foreground">{T('coachText')}</p>
        </div>
        <Button size="sm" onClick={() => setDraft({ id: '', keywords: '', answer: { fr: '', ar: '' }, subject_id: '', priority: 50, published: true })}>
          <Plus data-icon="inline-start" /> {T('addTip')}
        </Button>
      </header>

      {catalogue.tips.map((tip) => (
        <Card key={str(tip.id)}>
          <CardContent className="flex flex-wrap items-center justify-between gap-2 p-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                <Sparkles className="me-1 inline size-3.5" />
                {text(tip.answer, 120, locale)}
              </p>
              <p className="truncate text-xs text-muted-foreground">{Array.isArray(tip.keywords) ? (tip.keywords as string[]).join(', ') : ''}</p>
            </div>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" onClick={() => void mutate({ op: 'publish', table: 'coach_tips', id: str(tip.id), published: tip.published === false })}>
                {tip.published === false ? T('publish') : T('unpublish')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setDraft({
                    id: str(tip.id),
                    keywords: (Array.isArray(tip.keywords) ? (tip.keywords as string[]).join(', ') : ''),
                    answer: loc(tip.answer),
                    subject_id: str(tip.subject_id ?? ''),
                    priority: num(tip.priority, 50),
                    published: tip.published !== false,
                  })
                }
              >
                {T('edit')}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => confirm(T('confirmDel')) && void mutate({ op: 'delete', table: 'coach_tips', id: str(tip.id) })}>
                <Trash2 className="size-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      {draft && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/50 p-4">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {draft.id ? T('edit') : T('addTip')}
                <Button variant="ghost" size="sm" onClick={() => setDraft(null)}>
                  <X className="size-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <Field label={T('fKeywords')} value={draft.keywords} onValue={(keywords) => setDraft({ ...draft, keywords })} />
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-xs font-medium">
                  <span className="text-muted-foreground">{T('fSubject')}</span>
                  <select value={draft.subject_id} onChange={(e) => setDraft({ ...draft, subject_id: e.target.value })} className="min-h-10 rounded-lg border bg-card px-2">
                    <option value="">{T('none')}</option>
                    {catalogue.subjects.map((s) => (
                      <option key={str(s.id)} value={str(s.id)}>{text(s.name, 40, locale)}</option>
                    ))}
                  </select>
                </label>
                <Field label={T('fPriority')} value={String(draft.priority)} onValue={(v) => setDraft({ ...draft, priority: Number(v) || 0 })} type="number" />
              </div>
              <LocalizedPair label={T('answerLabel')} value={draft.answer} onChange={(answer) => setDraft({ ...draft, answer })} area />
            </CardContent>
            <div className="flex justify-end gap-2 border-t p-4">
              <Button variant="outline" onClick={() => setDraft(null)}>{T('cancel')}</Button>
              <Button
                disabled={!draft.keywords.trim() || (!draft.answer.fr && !draft.answer.ar)}
                onClick={async () => {
                  await mutate(
                    {
                      op: 'tip.upsert',
                      tip: {
                        id: draft.id || undefined,
                        keywords: draft.keywords.split(/[,;\n]/).map((k) => k.trim()).filter(Boolean),
                        answer: draft.answer,
                        subject_id: draft.subject_id || null,
                        priority: draft.priority,
                        published: draft.published,
                      },
                    },
                    '/api/admin/catalogue',
                    T('saved'),
                  )
                  setDraft(null)
                }}
              >
                {T('save')}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

/* --------------------------------------------------------------- Personnes */

function PeopleTab({ catalogue, mutate, reload, locale }: { catalogue: Catalogue; mutate: Mutate; reload: () => Promise<void>; locale: Locale }) {
  const T = (key: AdminKey) => tr(locale, key)
  const [label, setLabel] = useState('')
  const [subjectIds, setSubjectIds] = useState<string[]>([])
  const [created, setCreated] = useState('')
  const [err, setErr] = useState('')
  const people = (code: string) => catalogue.students.filter((s) => str(s.teacherCode) === code).length

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-serif text-2xl font-bold">{T('tabPeople')}</h2>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="size-4" /> {T('teachers')} · {catalogue.teachers.length}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex min-w-56 flex-1 flex-col gap-1 text-xs font-medium">
              <span className="text-muted-foreground">{T('teacherName')}</span>
              <Input value={label} onChange={(e) => setLabel(e.target.value)} />
            </label>
            <Button
              onClick={async () => {
                if (!label.trim()) return
                const res = await api<{ teacher?: { code?: string } }>('/api/admin/people', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ op: 'teacher.create', label, subjectIds }),
                }).catch((error: unknown) => {
                  setErr(error instanceof Error ? error.message : 'erreur')
                  return null
                })
                if (res?.teacher?.code) setCreated(res.teacher.code)
                setLabel('')
                setSubjectIds([])
                await reload()
              }}
            >
              <Plus data-icon="inline-start" /> {T('addTeacher')}
            </Button>
          </div>
          {created && (
            <p className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-sm">
              {T('teacherCode')}: <b className="font-mono">{created}</b>
            </p>
          )}
          {err && <p className="text-sm text-destructive">{err}</p>}
          <div className="grid gap-2 text-xs">
            {catalogue.subjects.map((s) => (
              <label key={str(s.id)} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={subjectIds.includes(str(s.id))}
                  onChange={() => setSubjectIds((v) => (v.includes(str(s.id)) ? v.filter((x) => x !== str(s.id)) : [...v, str(s.id)]))}
                />
                {text(s.name, 40, locale)}
              </label>
            ))}
          </div>

          {catalogue.teachers.map((teacher) => {
            const code = str(teacher.code)
            const isActive = teacher.active !== false
            return (
              <div key={code} className="flex flex-wrap items-center justify-between gap-2 border-b pb-2 text-sm">
                <div className="min-w-0">
                  <b>{str(teacher.label)}</b>
                  <span className="ms-2 font-mono text-xs">{code}</span>
                  {!isActive && <Badge variant="outline" className="ms-2">{T('disabled')}</Badge>}
                  <p className="text-xs text-muted-foreground">
                    {people(code)} {T('studentsOf')} · {((teacher.subject_ids as string[]) ?? []).length} {T('subjects')}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      void mutate({ op: 'teacher.update', code, label: str(teacher.label), subjectIds: (teacher.subject_ids as string[]) ?? [], active: !isActive }, '/api/admin/people')
                    }
                  >
                    {isActive ? T('disabled') : T('active')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm(T('confirmTeacherDel'))) void mutate({ op: 'teacher.delete', code }, '/api/admin/people')
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            )
          })}
          {!catalogue.teachers.length && <p className="text-sm text-muted-foreground">{T('noTeachers')}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{T('students')} · {catalogue.students.length}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2">
          {catalogue.students.map((student) => {
            const code = str(student.code)
            const profile = (student.profile ?? {}) as Record<string, unknown>
            return (
              <div key={code} className="flex flex-wrap items-center justify-between gap-2 border-b pb-2 text-sm">
                <div className="min-w-0">
                  <b className="font-mono">{code}</b>
                  <span className="ms-2 text-xs text-muted-foreground">
                    {str(profile.name) || '—'} · {str(profile.stream)} · {num(student.chapters)} chap. · {num(student.reviews)} à revoir
                  </span>
                  <p className="text-xs text-muted-foreground">
                    {T('lastSeen')}: {student.seenAt ? new Date(str(student.seenAt)).toLocaleDateString() : '—'} · {T('teacherCode')}: {str(student.teacherCode) || T('none')}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  <select
                    className="min-h-9 rounded-md border bg-card px-2 text-xs"
                    value={str(student.teacherCode)}
                    onChange={(e) => void mutate({ op: 'student.reassign', code, teacherCode: e.target.value }, '/api/admin/people')}
                  >
                    <option value="">{T('none')}</option>
                    {catalogue.teachers.map((teacher) => (
                      <option key={str(teacher.code)} value={str(teacher.code)}>{str(teacher.label)}</option>
                    ))}
                  </select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (confirm(T('confirmReset'))) void mutate({ op: 'student.reset', code }, '/api/admin/people')
                    }}
                  >
                    <RefreshCw className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm(T('confirmUnlink'))) void mutate({ op: 'student.unlink', code }, '/api/admin/people')
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            )
          })}
          {!catalogue.students.length && <p className="text-sm text-muted-foreground">{T('noStudents')}</p>}
        </CardContent>
      </Card>
    </div>
  )
}

/* --------------------------------------------------------------- Réglages */

function SettingsTab({ mutate, locale }: { mutate: Mutate; locale: Locale }) {
  const T = (key: AdminKey) => tr(locale, key)
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-serif text-2xl font-bold">{T('tabSettings')}</h2>
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle className="text-base">{T('changePin')}</CardTitle>
          <CardDescription>{T('settingsText')}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <Field label={T('currentPin')} value={current} onValue={setCurrent} type="password" />
          <Field label={T('nextPin')} value={next} onValue={setNext} type="password" />
          <Button
            disabled={!/^\d{4,8}$/.test(next)}
            onClick={() => {
              void mutate({ op: 'pin.change', current, next }, '/api/admin/people', T('saved')).then(() => {
                setCurrent('')
                setNext('')
              })
            }}
          >
            {T('save')}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
