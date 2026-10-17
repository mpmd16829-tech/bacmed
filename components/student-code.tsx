'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Copy, KeyRound, Loader, User } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ui } from '@/lib/i18n'
import { getDeviceId, type RestoredData } from '@/hooks/use-progress-sync'
import { tr, type AdminKey } from '@/lib/strings-admin'

type Props = {
  locale: 'fr' | 'ar'
  code: string
  online: boolean
  onboarded: boolean
  onCode: (code: string) => void
  onMerged: (restored: RestoredData) => void
}

type StudentView = { found: boolean; code?: string; teacherLabel?: string }

/**
 * Le code élève est l'identité de l'élève : c'est lui, et non l'appareil, qui porte la progression.
 * « Créer » émet un BAC-XXXXXX pour cet appareil ; « récupérer » reprend un code existant et fusionne
 * les deux progressions (rien de ce qui est maîtrisé ne disparaît).
 */
export function StudentCode({ locale, code, online, onboarded, onCode, onMerged }: Props) {
  const t = ui[locale]
  const T = (key: AdminKey) => tr(locale, key)
  const [teacher, setTeacher] = useState('')
  const [attach, setAttach] = useState('')
  const [busy, setBusy] = useState<'claim' | 'attach' | ''>('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [view, setView] = useState<StudentView | null>(null)
  const asked = useRef(false)

  // Un appareil déjà connu du serveur retrouve son code même si le localStorage a été vidé.
  useEffect(() => {
    if (code || !online || !onboarded || asked.current) return
    asked.current = true
    const deviceId = getDeviceId()
    if (!deviceId) return
    fetch(`/api/student?deviceId=${encodeURIComponent(deviceId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json: StudentView | null) => {
        if (json?.found && json.code) {
          onCode(json.code)
          setView(json)
        }
      })
      .catch(() => undefined)
  }, [code, online, onboarded, onCode])

  const claim = async () => {
    setBusy('claim')
    setError('')
    setMessage('')
    const deviceId = getDeviceId()
    if (!deviceId) return
    try {
      const res = await fetch('/api/student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ op: 'claim', deviceId, teacherCode: teacher.trim().toUpperCase() }),
      })
      const json = (await res.json()) as { code?: string; error?: string }
      if (!res.ok || !json.code) throw new Error(json.error || T('badTeacher'))
      onCode(json.code)
      setMessage(T('codeCreated'))
    } catch (e) {
      setError(e instanceof Error ? e.message : T('error'))
    } finally {
      setBusy('')
    }
  }

  const attachCode = async () => {
    setBusy('attach')
    setError('')
    setMessage('')
    const deviceId = getDeviceId()
    if (!deviceId) return
    try {
      const res = await fetch('/api/student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ op: 'attach', deviceId, code: attach.trim().toUpperCase() }),
      })
      const json = (await res.json()) as { merged?: Omit<RestoredData, 'locale'>; code?: string; error?: string }
      if (!res.ok || !json.merged) throw new Error(json.error || T('badCode'))
      onCode(json.code ?? attach.trim().toUpperCase())
      onMerged({ ...json.merged, attempts: json.merged.attempts ?? {} })
      setMessage(T('attached'))
      setAttach('')
    } catch (e) {
      setError(e instanceof Error ? e.message : T('badCode'))
    } finally {
      setBusy('')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <KeyRound className="size-4" /> {T('myCode')}
        </CardTitle>
        <CardDescription>{online ? T('myCodeText') : T('offlineNeeded')}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {code ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-xl border bg-secondary px-4 py-2 font-mono text-xl font-bold tracking-widest">{code}</span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                navigator.clipboard?.writeText(code).then(
                  () => {
                    setCopied(true)
                    setTimeout(() => setCopied(false), 1500)
                  },
                  () => undefined,
                )
              }}
            >
              {copied ? <Check data-icon="inline-start" /> : <Copy data-icon="inline-start" />}
              {copied ? T('copied') : T('copy')}
            </Button>
            {view?.teacherLabel && (
              <Badge variant="secondary">
                <User data-icon="inline-start" /> {T('linkedTeacher')}: {view.teacherLabel}
              </Badge>
            )}
          </div>
        ) : (
          <div className="grid gap-2">
            <label className="flex flex-col gap-1 text-sm">
              {T('teacherField')}
              <Input value={teacher} onChange={(e) => setTeacher(e.target.value)} placeholder="PRF-…" className="mt-1 font-mono uppercase" />
              <small className="text-muted-foreground">{T('teacherHint')}</small>
            </label>
            <Button onClick={claim} disabled={!online || busy === 'claim'}>
              {busy === 'claim' ? <Loader data-icon="inline-start" className="animate-spin" /> : null}
              {T('createCode')}
            </Button>
          </div>
        )}

        <div className="grid gap-2 border-t pt-3">
          <label className="flex flex-col gap-1 text-sm">
            {T('attachCode')}
            <Input
              value={attach}
              onChange={(e) => setAttach(e.target.value)}
              placeholder={T('attachPlaceholder')}
              className="mt-1 font-mono uppercase"
              inputMode="text"
            />
          </label>
          <Button variant="outline" onClick={attachCode} disabled={!online || busy === 'attach' || attach.trim().length < 6}>
            {busy === 'attach' ? <Loader data-icon="inline-start" className="animate-spin" /> : null}
            {busy === 'attach' ? T('attaching') : T('attach')}
          </Button>
        </div>

        {message && <p className="text-sm text-primary">{message}</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  )
}
