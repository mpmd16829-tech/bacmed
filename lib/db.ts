import { Pool } from 'pg'

let pool: Pool | null = null

/** One pooled client per serverless instance; `max` stays small because Neon Hobby limits connections. */
export function getPool(): Pool {
  if (!pool) {
    const url = process.env.DATABASE_URL
    if (!url) throw new Error('DATABASE_URL is not set')
    pool = new Pool({ connectionString: url, max: 2, idleTimeoutMillis: 10_000, ssl: { rejectUnauthorized: false } })
  }
  return pool
}

export async function query<T = Record<string, unknown>>(text: string, params: unknown[] = []) {
  const result = await getPool().query(text, params)
  return result.rows as T[]
}

export const hasDatabase = () => Boolean(process.env.DATABASE_URL)
