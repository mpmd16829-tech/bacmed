/**
 * Seed du catalogue : il n'écrase jamais ce que la console a déjà modifié (ON CONFLICT DO NOTHING).
 * Usage : npm run db:seed
 */
import { readFileSync } from 'node:fs'
import { Client } from 'pg'
import { streams } from '../lib/bac-data'
import { coachTipsSeed } from '../lib/coach-seed'

const line = readFileSync('.env.local', 'utf8').split(/\r?\n/).find((l) => l.startsWith('DATABASE_URL='))
if (!line) throw new Error('DATABASE_URL introuvable dans .env.local')
const url = line.slice('DATABASE_URL='.length).trim().replace(/^"|"$/g, '')

const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } })
const json = (v: unknown) => JSON.stringify(v ?? null)

const counts = { subjects: 0, links: 0, chapters: 0, exercises: 0, tips: 0 }

async function main() {
  await client.connect()

  for (const stream of streams) {
    for (const [index, subject] of stream.subjects.entries()) {
      const inserted = await client.query(
        `INSERT INTO subjects (id, name, short, position)
         VALUES ($1, $2::jsonb, $3, $4)
         ON CONFLICT (id) DO NOTHING`,
        [subject.id, json(subject.name), subject.short, index],
      )
      counts.subjects += inserted.rowCount ?? 0
      await client.query(
        `INSERT INTO stream_subjects (stream_id, subject_id, coefficient, position)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (stream_id, subject_id) DO NOTHING`,
        [stream.id, subject.id, subject.coefficient, index],
      )
      counts.links += 1

      for (const [chapterIndex, chapter] of subject.chapters.entries()) {
        const added = await client.query(
          `INSERT INTO chapters
             (id, subject_id, title, summary, duration, prerequisites, objectives, essentials, method, example, mistakes, recap, position, source)
           VALUES ($1,$2,$3::jsonb,$4::jsonb,$5,$6::jsonb,$7::jsonb,$8::jsonb,$9::jsonb,$10::jsonb,$11::jsonb,$12::jsonb,$13,'seed')
           ON CONFLICT (id) DO NOTHING`,
          [
            chapter.id,
            subject.id,
            json(chapter.title),
            json(chapter.summary),
            chapter.duration,
            json(chapter.prerequisites),
            json(chapter.objectives),
            json(chapter.essentials),
            json(chapter.method),
            json(chapter.example),
            json(chapter.mistakes),
            json(chapter.recap),
            chapterIndex,
          ],
        )
        counts.chapters += added.rowCount ?? 0

        for (const [exerciseIndex, exercise] of chapter.exercises.entries()) {
          const ex = await client.query(
            `INSERT INTO exercises
               (id, chapter_id, difficulty, duration, question, hint, answer, correction, position, source)
             VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7::jsonb,$8::jsonb,$9,'seed')
             ON CONFLICT (id) DO NOTHING`,
            [
              exercise.id,
              chapter.id,
              exercise.difficulty,
              exercise.duration,
              json(exercise.question),
              json(exercise.hint),
              json(exercise.answer),
              json(exercise.correction),
              exerciseIndex,
            ],
          )
          counts.exercises += ex.rowCount ?? 0
        }
      }
    }
  }

  for (const [index, tip] of coachTipsSeed.entries()) {
    const added = await client.query(
      `INSERT INTO coach_tips (id, keywords, answer, priority)
       VALUES ($1, $2, $3::jsonb, $4)
       ON CONFLICT (id) DO NOTHING`,
      [tip.id, tip.keywords, json(tip.answer), 100 - index],
    )
    counts.tips += added.rowCount ?? 0
  }

  const report = await client.query(
    `SELECT
       (SELECT count(*) FROM subjects) AS subjects,
       (SELECT count(*) FROM stream_subjects) AS links,
       (SELECT count(*) FROM chapters) AS chapters,
       (SELECT count(*) FROM exercises) AS exercises,
       (SELECT count(*) FROM coach_tips) AS tips`,
  )
  console.log('inserté   :', counts)
  console.log('en base  :', report.rows[0])
  await client.end()
}

main().catch((error) => {
  console.error('ERR', error.message)
  process.exit(1)
})
