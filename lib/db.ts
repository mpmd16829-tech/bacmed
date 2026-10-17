import { Pool } from 'pg'

let pool: Pool | null = null

/**
 * Base de la production. Un identifiant d'endpoint n'est pas un secret : c'est la partie visible
 * du hostname, et la comparer permet de refaire le garde-fou ci-dessous sans mettre de credential
 * dans le code.
 */
const PROD_ENDPOINT = 'ep-green-term-b4naruyl'

/** Une seule pool par instance serverless : `max` reste petit, Neon Hobby limite les connexions. */
export function getPool(): Pool {
  if (!pool) {
    const url = process.env.DATABASE_URL
    if (!url) throw new Error('DATABASE_URL is not set')
    // Le local et la prod ont longtemps partagé la même base : les lignes de test d'un appareil
    // atterrissaient chez les vrais élèves. `next dev` refuse donc la base de prod, sauf choix
    // assumé via PREPABAC_ALLOW_PROD_DEV=1 dans .env.local.
    if (url.includes(PROD_ENDPOINT) && process.env.NODE_ENV === 'development' && process.env.PREPABAC_ALLOW_PROD_DEV !== '1') {
      throw new Error(
        `DATABASE_URL pointe sur la base de production (${PROD_ENDPOINT}) depuis next dev. ` +
          'Prends une branche Neon pour le dev, ou mets PREPABAC_ALLOW_PROD_DEV=1 dans .env.local si c\'est vraiment voulu.',
      )
    }
    pool = new Pool({ connectionString: url, max: 2, idleTimeoutMillis: 10_000, ssl: { rejectUnauthorized: false } })
  }
  return pool
}

export async function query<T = Record<string, unknown>>(text: string, params: unknown[] = []) {
  const result = await getPool().query(text, params)
  return result.rows as T[]
}

export const hasDatabase = () => Boolean(process.env.DATABASE_URL)
