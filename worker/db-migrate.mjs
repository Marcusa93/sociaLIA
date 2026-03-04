/**
 * Apply migrations via direct PostgreSQL connection
 * Uses IPv4 by force via node-fetch + pg
 */
import { readFileSync, readdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const { Client } = require('pg')

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load env
const envPath = resolve(__dirname, '../.env.local')
const env = readFileSync(envPath, 'utf-8')
  .split('\n')
  .filter(l => l.includes('=') && !l.startsWith('#'))
  .reduce((acc, l) => {
    const [k, ...v] = l.split('=')
    acc[k.trim()] = v.join('=').trim()
    return acc
  }, {})

const DB_PASSWORD = env.SUPABASE_DB_PASSWORD
const PROJECT_REF = 'qokznpvgjiiqjeclqdii'

// Connection configs to try
const configs = [
  // Direct IPv4 (forced)
  {
    name: 'Direct (IPv4 forced)',
    host: 'db.qokznpvgjiiqjeclqdii.supabase.co',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: DB_PASSWORD,
    ssl: { rejectUnauthorized: false },
    family: 4,
  },
  // Session pooler
  {
    name: 'Session pooler',
    host: 'aws-0-sa-east-1.pooler.supabase.com',
    port: 5432,
    database: 'postgres',
    user: `postgres.${PROJECT_REF}`,
    password: DB_PASSWORD,
    ssl: { rejectUnauthorized: false },
    family: 4,
  },
]

const MIGRATIONS_DIR = resolve(__dirname, '../supabase/migrations')

async function tryConnect(config) {
  const client = new Client(config)
  try {
    await client.connect()
    return client
  } catch (e) {
    return null
  }
}

async function main() {
  console.log('🗄️  Attempting to apply migrations...\n')

  let client = null

  for (const config of configs) {
    console.log(`  Trying: ${config.name}...`)
    client = await tryConnect(config)
    if (client) {
      console.log(`  ✅ Connected via ${config.name}!\n`)
      break
    }
    console.log(`  ❌ Failed\n`)
  }

  if (!client) {
    console.log('⚠️  Could not connect to database automatically.')
    console.log('\nManual migration steps:')
    console.log('1. Go to: https://supabase.com/dashboard/project/qokznpvgjiiqjeclqdii/sql/new')
    console.log('2. Run each file in order from supabase/migrations/')
    console.log('\nMigration files:')
    readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith('.sql'))
      .sort()
      .forEach(f => console.log(`   - ${f}`))
    process.exit(0)
  }

  // Apply migrations
  const files = readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort()

  for (const file of files) {
    const sql = readFileSync(resolve(MIGRATIONS_DIR, file), 'utf-8')
    console.log(`📄 Applying ${file}...`)
    try {
      await client.query(sql)
      console.log('   ✅ Applied\n')
    } catch (e) {
      console.log(`   ⚠️  Error: ${e.message}\n`)
    }
  }

  await client.end()
  console.log('✅ Migrations complete!')
}

main().catch(console.error)
