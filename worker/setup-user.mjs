/**
 * Setup demo user:
 * 1. Drop trigger temporarily (via direct pg)
 * 2. Create user (via Admin API)
 * 3. Insert profile manually (via service role)
 * 4. Re-create trigger (via direct pg)
 */
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const { Client } = require('pg')
const { createClient } = require('@supabase/supabase-js')

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dirname, '../.env.local')
const env = readFileSync(envPath, 'utf-8')
  .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
  .reduce((acc, l) => { const [k, ...v] = l.split('='); acc[k.trim()] = v.join('=').trim(); return acc }, {})

const DB_PASSWORD = env.SUPABASE_DB_PASSWORD
const PROJECT_REF = 'qokznpvgjiiqjeclqdii'
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY

const EMAIL = 'admin@demo.com'
const PASSWORD = 'SociaLIA2025!'

async function connectPg() {
  for (const config of [
    { host: `db.${PROJECT_REF}.supabase.co`, port: 5432, database: 'postgres', user: 'postgres', password: DB_PASSWORD, ssl: { rejectUnauthorized: false }, family: 4 },
    { host: 'aws-0-sa-east-1.pooler.supabase.com', port: 5432, database: 'postgres', user: `postgres.${PROJECT_REF}`, password: DB_PASSWORD, ssl: { rejectUnauthorized: false }, family: 4 },
  ]) {
    try {
      const c = new Client(config)
      await c.connect()
      return c
    } catch {}
  }
  return null
}

async function main() {
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  // Step 1: drop trigger via pg
  console.log('1. Conectando a la DB...')
  const pg = await connectPg()
  if (pg) {
    await pg.query('DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;')
    console.log('   ✅ Trigger desactivado')
  } else {
    console.log('   ⚠️  Sin conexión directa, continuando sin desactivar trigger')
  }

  // Step 2: create user via Admin API
  console.log('2. Creando usuario...')
  const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
    email: EMAIL, password: PASSWORD, email_confirm: true,
  })

  let userId
  if (createErr) {
    console.log(`   ⚠️  ${createErr.message}, buscando usuario existente...`)
    const { data: list } = await supabase.auth.admin.listUsers({ perPage: 100 })
    const existing = list?.users?.find(u => u.email === EMAIL)
    if (existing) userId = existing.id
    else { console.error('   ❌ No se pudo crear ni encontrar el usuario'); if (pg) await pg.end(); return }
  } else {
    userId = newUser.user.id
    console.log(`   ✅ Usuario creado: ${EMAIL} (${userId})`)
  }

  // Step 3: create/update profile
  console.log('3. Vinculando a org demo...')
  const { data: org } = await supabase.from('organizations').select('id').eq('slug', 'socialía-demo').single()
  if (!org) { console.error('   ❌ Org demo no encontrada'); if (pg) await pg.end(); return }

  const { data: profile } = await supabase.from('profiles').select('id').eq('user_id', userId).single()
  if (profile) {
    // Update org_id if needed
    await supabase.from('profiles').update({ organization_id: org.id, role: 'admin' }).eq('user_id', userId)
    console.log('   ✅ Perfil actualizado')
  } else {
    const { error: pErr } = await supabase.from('profiles').insert({
      user_id: userId, organization_id: org.id, role: 'admin', full_name: 'Demo Admin'
    })
    if (pErr) console.error('   ❌ Error perfil:', pErr.message)
    else console.log('   ✅ Perfil creado')
  }

  // Step 4: re-create trigger
  if (pg) {
    await pg.query(`
      CREATE OR REPLACE FUNCTION handle_new_user()
      RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
      DECLARE org_id UUID;
      BEGIN
        SELECT id INTO org_id FROM organizations LIMIT 1;
        IF org_id IS NULL THEN
          INSERT INTO organizations (name, slug) VALUES ('Default', 'default') RETURNING id INTO org_id;
        END IF;
        INSERT INTO profiles (user_id, organization_id, role, full_name)
        VALUES (NEW.id, org_id, 'admin', COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)))
        ON CONFLICT (user_id) DO NOTHING;
        RETURN NEW;
      END;$$;
      CREATE TRIGGER on_auth_user_created
        AFTER INSERT ON auth.users
        FOR EACH ROW EXECUTE FUNCTION handle_new_user();
    `)
    await pg.end()
    console.log('4. ✅ Trigger reactivado')
  }

  console.log('\n🎉 Acceso listo:')
  console.log(`   Email:    ${EMAIL}`)
  console.log(`   Password: ${PASSWORD}`)
  console.log('   URL:      http://localhost:3000/login')
}

main().catch(console.error)
