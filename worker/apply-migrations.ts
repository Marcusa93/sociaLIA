/**
 * Apply all SQL migrations to the Supabase project
 * via the service role key and REST API
 * Run: pnpm migrate
 *
 * NOTE: This uses a custom approach since direct DB connection
 * may not be available in all environments.
 * Alternatively, apply migrations via the Supabase Dashboard SQL editor.
 */

import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const MIGRATIONS_DIR = path.resolve(process.cwd(), 'supabase/migrations')

async function executeSql(sql: string): Promise<{ success: boolean; error?: string }> {
  // The Supabase REST API doesn't support DDL directly
  // We use the pg REST endpoint which requires the service role
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ sql }),
  })

  if (response.ok) {
    return { success: true }
  }

  const body = await response.text()

  // If exec_sql doesn't exist, try another approach
  if (response.status === 404 || body.includes('not found')) {
    return {
      success: false,
      error: 'exec_sql function not available. Please apply migrations manually via the Supabase Dashboard.',
    }
  }

  return { success: false, error: body }
}

async function main() {
  console.log('🗄️  Applying migrations to Supabase...')
  console.log(`   URL: ${SUPABASE_URL}`)
  console.log()

  const migrationFiles = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort()

  for (const file of migrationFiles) {
    const filePath = path.join(MIGRATIONS_DIR, file)
    const sql = fs.readFileSync(filePath, 'utf-8')
    console.log(`📄 ${file}...`)

    const result = await executeSql(sql)
    if (result.success) {
      console.log(`   ✅ Applied`)
    } else {
      console.log(`   ⚠️  Could not apply automatically: ${result.error}`)
      console.log()
      console.log('   📋 Manual application instructions:')
      console.log('   1. Go to https://supabase.com/dashboard/project/qokznpvgjiiqjeclqdii/sql/new')
      console.log('   2. Paste the content of the migration file')
      console.log('   3. Run the query')
      console.log()
    }
  }

  console.log()
  console.log('ℹ️  If migrations failed automatically, apply them via the Supabase Dashboard:')
  console.log('   https://supabase.com/dashboard/project/qokznpvgjiiqjeclqdii/sql/new')
  console.log()
  console.log('Migration files location: supabase/migrations/')
}

main().catch(console.error)
