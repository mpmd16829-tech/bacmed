#!/usr/bin/env node
// Dit sur quelle base on travaille SANS jamais afficher le mot de passe.
// Usage : npm run db:target
const { readFileSync, existsSync } = require('node:fs')
const path = require('node:path')

const PROD_ENDPOINT = 'ep-green-term-b4naruyl'
const envFile = path.join(__dirname, '..', '.env.local')

let url = process.env.DATABASE_URL
if (!url && existsSync(envFile)) {
  const line = readFileSync(envFile, 'utf8')
    .split(/\r?\n/)
    .find((l) => l.startsWith('DATABASE_URL='))
  url = line ? line.slice('DATABASE_URL='.length).trim().replace(/^["']|["']$/g, '') : undefined
}

if (!url) {
  console.log('DATABASE_URL : absent (.env.local introuvable ou vide)')
  process.exit(1)
}

const host = (() => {
  try {
    return new URL(url).hostname
  } catch {
    return url.split('@').pop().split('/')[0]
  }
})()
const endpoint = host.split('.')[0].replace(/-pooler$/, '')
const isProd = host.includes(PROD_ENDPOINT)
const isDev = (process.env.NODE_ENV || 'production') === 'development'
const allowed = process.env.PREPABAC_ALLOW_PROD_DEV === '1'

console.log(`endpoint    : ${endpoint}`)
console.log(`rôle        : ${isProd ? 'PRODUCTION' : 'branche / autre base'}`)
console.log(`NODE_ENV    : ${process.env.NODE_ENV || 'production'}`)
console.log(`base de prod en next dev : ${isProd && isDev && !allowed ? 'BLOQUÉE par le garde-fou (lib/db.ts)' : 'autorisée'}`)
if (isProd && isDev && !allowed) {
  console.log('             → créer une branche : neon branches create --project-id <id> --branch dev-<prenom>')
}
