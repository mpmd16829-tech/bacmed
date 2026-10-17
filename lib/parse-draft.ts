import type { Localized } from './i18n'

/**
 * An imported document is not a course yet: this turns raw text into a draft the console shows before
 * anything is written, because a bad split should never reach a student silently.
 * Section labels (Objectifs, Méthode, Exercices, أهداف, منهجية…) are routed to the matching chapter
 * field, so an imported lesson keeps the same structure as a hand-written one.
 */

export type DraftExercise = {
  question: Localized
  answer: Localized
  hint: Localized
  correction: Localized
  difficulty: 1 | 2 | 3
  duration: number
}

export type DraftChapter = {
  title: Localized
  summary: Localized
  prerequisites: Localized[]
  objectives: Localized[]
  essentials: Localized[]
  method: Localized[]
  example: Localized
  mistakes: Localized[]
  recap: Localized
  exercises: DraftExercise[]
}

const arabic = (value: string) => (value.match(/[\u0600-\u06FF]/g)?.length ?? 0) > value.replace(/\s/g, '').length * 0.3

const localized = (value: string): Localized => (arabic(value) ? { fr: '', ar: value } : { fr: value, ar: '' })

const HEADING = /^(chapitre|chapter|le[çc]on|lesson|cours|unit[ée]|th[èe]me|module|tp|الدرس|الفصل|الوحدة|محور)/i
const NUMBERED = /^\s*\d{1,3}[\.\)]\s+(?=\S)/
const QUESTION = /^(exercice|exercise|question|ex|q|probl[èe]me|s[ée]rie|tp|تمارين|تمرين|سؤال)/i
const ANSWER = /^(r[ée]ponse|corrig[ée]|solution|الجواب|الحل|تصحيح)\s*[:.]?\s*/i
const BULLET = /^[-*•–—]\s*/

type Bucket = 'essentials' | 'objectives' | 'prerequisites' | 'method' | 'mistakes' | 'recap' | 'example' | 'summary' | 'exercises'

/** Libellés de section reconnus, en français comme en arabe. */
const SECTIONS: { bucket: Bucket; test: RegExp }[] = [
  { bucket: 'objectives', test: /^(objectifs?|comp[ée]tences|acquis d'?apprentissage|أهداف|الكفايات)/i },
  { bucket: 'prerequisites', test: /^(pr[ée]requis|notions pr[ée]alables|المكتسبات القبلية|تمهيدات)/i },
  { bucket: 'method', test: /^(m[ée]thode|d[ée]marche|étapes|proc[ée]dure|منهجية|الخطوات)/i },
  { bucket: 'mistakes', test: /^(erreurs?|pi[èe]ges|fautes?|à[ée]viter|أخطاء|التجاوزات)/i },
  { bucket: 'example', test: /^(exemples?|application num[ée]rique|مثال)/i },
  { bucket: 'recap', test: /^(r[ée]sum[ée]|synth[èe]se|conc[ée]lusion|à reti|خلاصة|الحصيلة)/i },
  { bucket: 'summary', test: /^(introduction|d[ée]finitions?|notions? essentielles|vocabulaire|مقدمة|تعريفات)/i },
  // Une section d'exercices ne contient que des énoncés : le texte libre y est ignoré.
  { bucket: 'exercises', test: /^(exercices?|s[ée]ries?|facades?|devoirs?|contr[ôo]les?|تمارين|تطبيقات|فروض|امتحانات)/i },
]

const sectionOf = (line: string): Bucket | null => {
  const bare = line.replace(BULLET, '').replace(/^#{1,6}\s*/, '').replace(/[:.\s]+$/, '').trim()
  if (bare.length > 46) return null
  for (const section of SECTIONS) if (section.test.test(bare)) return section.bucket
  return null
}

const headingLevel = (line: string) => {
  const match = /^(#{1,6})\s/.exec(line)
  return match ? match[1].length : 0
}

const isChapterLine = (line: string) => {
  const level = headingLevel(line)
  if (level === 1) return true
  if (level >= 2) return false
  const bare = line.replace(BULLET, '')
  return bare.length <= 90 && HEADING.test(bare) && sectionOf(bare) === null
}

const cleanTitle = (line: string) => line.replace(/^#{1,6}\s*/, '').replace(BULLET, '').replace(/[:.\s]+$/, '').trim()

const newChapter = (title: string): DraftChapter => ({
  title: localized(title),
  summary: { fr: '', ar: '' },
  prerequisites: [],
  objectives: [],
  essentials: [],
  method: [],
  example: { fr: '', ar: '' },
  mistakes: [],
  recap: { fr: '', ar: '' },
  exercises: [],
})

/* --------------------------------------------------------------- tableaux (CSV) */

const COLUMNS: { key: 'title' | 'question' | 'answer' | 'hint' | 'difficulty'; test: RegExp }[] = [
  { key: 'title', test: /^(titre|chapitre|cours|le[çc]on|mati[èe]re|s[ée]quence|module|عنوان|الفصل|المادة|وحدة)/i },
  { key: 'question', test: /^(question|[ée]nonc[ée]|sujet|exercice|ex|تمرين|سؤال|نشاط)/i },
  { key: 'answer', test: /^(r[ée]ponse|corrig[ée]|correction|solution|الجواب|الحل|تصحيح)/i },
  { key: 'hint', test: /^(indice|indication|hint|تلميح)/i },
  { key: 'difficulty', test: /^(difficult[ée]|niveau|coefficient|الصعوبة)/i },
]

const columnOf = (header: string) => COLUMNS.find((column) => column.test.test(header.trim()))?.key

/** Un CSV d'exercices a une ligne d'entête et des colonnes nommées : c'est le format le plus prévisible. */
function parseTable(rows: string[]): DraftChapter[] | null {
  const table = rows.filter((line) => line.includes(' | ')).map((line) => line.split(' | ').map((cell) => cell.trim()))
  if (table.length < 2) return null
  const head = table[0].map(columnOf)
  const questionAt = head.indexOf('question')
  if (questionAt < 0) return null
  const titleAt = head.indexOf('title')
  const answerAt = head.indexOf('answer')
  const hintAt = head.indexOf('hint')
  const difficultyAt = head.indexOf('difficulty')

  const chapters: DraftChapter[] = []
  const indexOfTitle = new Map<string, number>()
  for (const row of table.slice(1)) {
    const question = row[questionAt] ?? ''
    if (!question) continue
    const titleKey = (titleAt >= 0 && row[titleAt]) || 'Série d’exercices importée'
    let index = indexOfTitle.get(titleKey)
    if (index === undefined) {
      index = chapters.length
      indexOfTitle.set(titleKey, index)
      chapters.push(newChapter(titleKey))
    }
    const difficultyRaw = difficultyAt >= 0 ? Number(row[difficultyAt]) : 1
    chapters[index].exercises.push({
      question: localized(question),
      answer: localized(answerAt >= 0 ? row[answerAt] ?? '' : ''),
      hint: localized(hintAt >= 0 ? row[hintAt] ?? '' : ''),
      correction: localized(answerAt >= 0 ? row[answerAt] ?? '' : ''),
      difficulty: (difficultyRaw === 2 || difficultyRaw === 3 ? difficultyRaw : 1) as 1 | 2 | 3,
      duration: 10,
    })
  }
  return chapters.length ? chapters : null
}

export function parseDraft(raw: string): { chapters: DraftChapter[]; skipped: number } {
  const lines = raw
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/\s*\t\s*/g, ' | ').replace(/[ \t]+/g, ' ').replace(BULLET, '').trim())
    .filter((line) => line.length > 1)

  const table = parseTable(lines)
  if (table) {
    return {
      chapters: table.map((chapter) => ({ ...chapter, summary: chapter.essentials[0] ?? { fr: '', ar: '' } })),
      skipped: 0,
    }
  }

  const chapters: DraftChapter[] = []
  let current: DraftChapter | null = null
  let bucket: Bucket = 'summary'
  let pending: DraftExercise | null = null
  let skipped = 0

  const openChapter = (title: string) => {
    pushPending()
    pending = null
    bucket = 'summary'
    current = newChapter(title)
    chapters.push(current)
  }

  function pushPending() {
    if (pending && (pending.question.fr || pending.question.ar)) current?.exercises.push(pending)
    pending = null
  }

  const add = (key: 'prerequisites' | 'objectives' | 'essentials' | 'method' | 'mistakes', line: string) => {
    if (!current) return
    const items = current[key]
    if (items.length < 24) items.push(localized(line))
  }

  const addLong = (key: 'example' | 'recap' | 'summary', line: string) => {
    if (!current) return
    const item = localized(line)
    const existing = current[key]
    current[key] = {
      fr: `${existing.fr} ${item.fr}`.trim().slice(0, 6000),
      ar: `${existing.ar} ${item.ar}`.trim().slice(0, 6000),
    }
  }

  for (const line of lines) {
    if (isChapterLine(line)) {
      openChapter(cleanTitle(line))
      continue
    }

    // A section label only steers where the next lines go; it is not content itself.
    const section = sectionOf(line)
    if (section && !pending) {
      bucket = section
      continue
    }

    const numbered = NUMBERED.exec(line)
    const body = numbered ? line.replace(NUMBERED, '') : line
    const looksLikeQuestion = QUESTION.test(body) || body.includes('?') || body.includes('؟') || body.length > 40
    if (numbered && (bucket === 'exercises' || looksLikeQuestion)) {
      pushPending()
      pending = { question: localized(body), answer: localized(''), hint: localized(''), correction: localized(''), difficulty: 1, duration: 10 }
      continue
    }
    if (!numbered && QUESTION.test(line) && looksLikeQuestion) {
      pushPending()
      pending = { question: localized(line), answer: localized(''), hint: localized(''), correction: localized(''), difficulty: 1, duration: 10 }
      continue
    }
    if (ANSWER.test(line)) {
      const body = line.replace(ANSWER, '').trim()
      if (pending) {
        pending.answer = localized(body)
        pending.correction = localized(body)
      } else if (body) {
        add('essentials', body)
      }
      continue
    }

    if (pending) {
      // Anything after a question belongs to it until the next question: statement parts, then the answer.
      const item = localized(line)
      if (pending.answer.fr || pending.answer.ar) {
        pending.correction = {
          fr: `${pending.correction.fr} ${item.fr}`.trim(),
          ar: `${pending.correction.ar} ${item.ar}`.trim(),
        }
      } else pending.answer = item
      continue
    }

    if (line.length > 400) {
      skipped += 1
      continue
    }
    if (!current) openChapter(line.length > 70 ? 'Contenu importé' : cleanTitle(line))
    if (bucket === 'objectives') add('objectives', line)
    else if (bucket === 'prerequisites') add('prerequisites', line)
    else if (bucket === 'method') add('method', line)
    else if (bucket === 'mistakes') add('mistakes', line)
    else if (bucket === 'example') addLong('example', line)
    else if (bucket === 'recap') addLong('recap', line)
    else if (bucket === 'summary') addLong('summary', line)
    else if (bucket === 'exercises') skipped += 1
    else add('essentials', line)
  }
  pushPending()

  return {
    chapters: chapters
      .map((chapter) => ({
        ...chapter,
        // Une fiche sans résumé garde sa première notion : l'élève voit toujours une accroche.
        summary: chapter.summary.fr || chapter.summary.ar ? chapter.summary : chapter.essentials[0] ?? { fr: '', ar: '' },
        essentials: chapter.essentials.slice(0, 24),
        exercises: chapter.exercises.filter((x) => x.question.fr || x.question.ar),
      }))
      .filter((chapter) => chapter.title.fr || chapter.title.ar),
    skipped,
  }
}
