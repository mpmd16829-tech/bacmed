import { NextResponse } from 'next/server'
import { loadCatalogue, loadCoachTips, seedStreamsFor, STREAM_IDS } from '@/lib/content-server'
import { hasDatabase } from '@/lib/db'

export const runtime = 'nodejs'

const HEADERS = { 'Cache-Control': 'public, max-age=0, s-maxage=30, stale-while-revalidate=300' }

/**
 * Public catalogue (courses + exercises + coach tips).
 * Everything comes from the database so the console can edit it, but a stream that was never
 * seeded — or a database that is not configured — answers with the bundled catalogue instead of
 * an empty page, so a student always has something to read.
 */
export async function GET(request: Request) {
  const wanted = new URL(request.url).searchParams.get('stream') ?? ''
  const all = wanted.toLowerCase() === 'all'
  const streamId = all ? null : STREAM_IDS.includes(wanted as (typeof STREAM_IDS)[number]) ? wanted : 'D'

  try {
    if (!hasDatabase()) {
      return NextResponse.json({ version: 0, offline: true, streams: bundledStreams() }, { headers: HEADERS })
    }
    const [catalogue, coach] = await Promise.all([loadCatalogue(), loadCoachTips()])
    const etag = `"content-${catalogue.version}"`
    if (request.headers.get('if-none-match') === etag) return new NextResponse(null, { status: 304, headers: HEADERS })

    if (catalogue.empty) {
      return NextResponse.json(
        { version: 0, unseeded: true, streams: bundledStreams() },
        { headers: { ...HEADERS, ETag: etag } },
      )
    }

    const payload = all
      ? { version: catalogue.version, streams: catalogue.streams.map((s) => ({ id: s.id, subjects: s.subjects })), coach }
      : { version: catalogue.version, streams: catalogue.streams.filter((s) => s.id === streamId), coach }

    return NextResponse.json(payload, { headers: { ...HEADERS, ETag: etag } })
  } catch (error) {
    console.error('GET /api/content failed', error)
    return NextResponse.json({ version: 0, error: 'server error', streams: bundledStreams() }, { status: 500 })
  }
}

/** Same shape as the database answer, built from the catalogue shipped in lib/bac-data.ts. */
function bundledStreams() {
  return STREAM_IDS.map((id) => ({
    id,
    subjects: seedStreamsFor(id).map((subject) => ({
      id: subject.id,
      name: subject.name,
      short: subject.short,
      coefficient: subject.coefficient,
      chapters: subject.chapters,
    })),
  }))
}
