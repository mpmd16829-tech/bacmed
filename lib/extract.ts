import { unzipSync, strFromU8 } from 'fflate'

export type Extracted = { kind: 'text' | 'unsupported'; filename: string; text: string; pages?: number; note?: string }

const decode = (bytes: Uint8Array) => new TextDecoder('utf-8', { fatal: false }).decode(bytes)

const stripTags = (value: string) =>
  value
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/[ \t]+/g, ' ')

const extension = (name: string) => name.split('.').pop()?.toLowerCase() ?? ''

/** Word keeps its body in word/document.xml; one paragraph per </w:p> keeps the structure readable. */
function docxText(bytes: Uint8Array): string {
  const files = unzipSync(bytes, { filter: (f) => f.name === 'word/document.xml' })
  const xml = strFromU8(files['word/document.xml'] ?? new Uint8Array())
  return xml
    .split('</w:p>')
    .map((chunk) => {
      const text = Array.from(chunk.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)).map((m) => m[1]).join('')
      return stripTags(text).trim()
    })
    .filter(Boolean)
    .join('\n')
}

/** Table rows are the useful part of a CSV: join cells with a tab so questions and answers stay apart. */
function csvText(raw: string): string {
  const delimiter = raw.includes(';') && !raw.includes(',') ? ';' : ','
  return raw
    .split(/\r?\n/)
    .map((line) => {
      const cells: string[] = []
      let current = ''
      let quoted = false
      for (const character of line) {
        if (character === '"') quoted = !quoted
        else if (character === delimiter && !quoted) {
          cells.push(current.trim())
          current = ''
        } else current += character
      }
      cells.push(current.trim())
      return cells.filter(Boolean).join('\t')
    })
    .filter(Boolean)
    .join('\n')
}

/** JSON of any shape: keep every string we find, which covers both lesson dumps and question banks. */
function jsonText(raw: string): string {
  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    return raw
  }
  const out: string[] = []
  const walk = (node: unknown, depth = 0) => {
    if (depth > 8) return
    if (typeof node === 'string') {
      if (node.trim()) out.push(node.trim())
    } else if (Array.isArray(node)) {
      node.forEach((item) => walk(item, depth + 1))
    } else if (node && typeof node === 'object') {
      Object.values(node as Record<string, unknown>).forEach((item) => walk(item, depth + 1))
    }
  }
  walk(value)
  return out.join('\n')
}

async function pdfText(bytes: Uint8Array): Promise<{ text: string; pages: number }> {
  const { extractText, getDocumentProxy } = await import('unpdf')
  const document = await getDocumentProxy(bytes)
  const { text, totalPages } = await extractText(document, { mergePages: true })
  return { text: (Array.isArray(text) ? text.join('\n') : String(text)).replace(/[ \t]+\n/g, '\n'), pages: totalPages }
}

/**
 * Any uploaded file becomes plain text, or an honest "unsupported" answer for media we cannot read.
 * Never trusts the content-type header — the extension and the magic bytes decide.
 */
export async function extractText(filename: string, bytes: Uint8Array): Promise<Extracted> {
  const ext = extension(filename)
  const head = Array.from(bytes.slice(0, 8))
  const isZip = head[0] === 0x50 && head[1] === 0x4b
  const isPdf = head[0] === 0x25 && head[1] === 0x50 && head[2] === 0x44 && head[3] === 0x46

  try {
    if (ext === 'pdf' || isPdf) {
      const { text, pages } = await pdfText(bytes)
      return { kind: 'text', filename, text, pages }
    }
    if ((ext === 'docx' || isZip) && filename.toLowerCase().includes('doc')) {
      return { kind: 'text', filename, text: docxText(bytes) }
    }
    if (ext === 'docx') {
      try {
        return { kind: 'text', filename, text: docxText(bytes) }
      } catch {
        return { kind: 'unsupported', filename, text: '', note: 'DOCX illisible (fichier probablement chiffré ou corrompu).' }
      }
    }
    if (ext === 'json') return { kind: 'text', filename, text: jsonText(decode(bytes)) }
    if (ext === 'csv' || ext === 'tsv') return { kind: 'text', filename, text: csvText(decode(bytes)) }
    if (['txt', 'md', 'markdown', 'html', 'htm', 'xml', 'rtf', 'log', 'srt', 'vtt'].includes(ext)) {
      const raw = decode(bytes)
      return { kind: 'text', filename, text: ['html', 'htm', 'xml'].includes(ext) ? stripTags(raw) : raw }
    }
    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'mp3', 'mp4', 'wav', 'avi', 'mov', 'zip', 'rar', '7z', 'exe'].includes(ext)) {
      return { kind: 'unsupported', filename, text: '', note: `Les fichiers .${ext} ne peuvent pas être lus comme un cours. Utilise PDF, DOCX, TXT, MD, JSON ou CSV.` }
    }
    // Unknown extension: try to read it as UTF-8 text, which is what most lesson dumps are.
    const guess = decode(bytes)
    if (/\p{L}|\d/u.test(guess) && !guess.includes('\u0000')) return { kind: 'text', filename, text: guess }
    return { kind: 'unsupported', filename, text: '', note: 'Format non reconnu : le fichier ne semble pas contenir de texte.' }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'lecture impossible'
    return { kind: 'unsupported', filename, text: '', note: message }
  }
}
