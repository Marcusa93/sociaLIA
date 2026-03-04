/**
 * Checks trigger and creates user manually
 */
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(process.cwd(), '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const EMAIL = 'admin@demo.com'
const PASSWORD = 'SociaLIA2025!'

async function main() {
  // 1. Check orgs
  const { data: orgs, error: orgErr } = await supabase
    .from('organizations')
    .select('id, slug')
  console.log('Orgs:', orgs, orgErr?.message)

  // 2. Try to delete existing user if any (in case of partial failure)
  const { data: list } = await supabase.auth.admin.listUsers({ perPage: 100 })
  const existing = list?.users?.find(u => u.email === EMAIL)
  if (existing) {
    console.log('Found existing user:', existing.id)
    // Check profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, organization_id')
      .eq('user_id', existing.id)
      .single()
    console.log('Existing profile:', profile)

    if (!profile) {
      // Need to link to org
      const org = orgs?.find(o => o.slug === 'socialía-demo') || orgs?.[0]
      if (org) {
        const { error } = await supabase.from('profiles').insert({
          user_id: existing.id,
          organization_id: org.id,
          role: 'admin',
          full_name: 'Demo Admin',
        })
        if (error) console.error('Profile insert error:', error.message)
        else console.log('✅ Profile created for existing user')
      }
    }

    console.log('\n🎉 Credenciales:')
    console.log(`   Email:    ${EMAIL}`)
    console.log(`   Password: ${PASSWORD}`)
    console.log('   URL:      http://localhost:3000/login')
    return
  }

  // 3. Try admin createUser - if trigger fails, catch and handle
  const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
  })

  if (createErr) {
    console.error('Create error:', createErr.message)
    console.log('\nTrying to delete trigger and retry via Supabase SQL editor:')
    console.log('Run this SQL in https://supabase.com/dashboard/project/qokznpvgjiiqjeclqdii/sql/new:')
    console.log(`
-- 1. Drop the trigger temporarily
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. Then create the user via Dashboard > Authentication > Users
-- Email: ${EMAIL}
-- Password: ${PASSWORD}
-- Then run:
-- INSERT INTO profiles (user_id, organization_id, role, full_name)
-- SELECT u.id, o.id, 'admin', 'Demo Admin'
-- FROM auth.users u, organizations o
-- WHERE u.email = '${EMAIL}' AND o.slug = 'socialía-demo';

-- 3. Re-enable trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
`)
    return
  }

  // 4. Manually create profile (trigger might have done it already)
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', newUser.user.id)
    .single()

  if (!profile) {
    const org = orgs?.find(o => o.slug === 'socialía-demo') || orgs?.[0]
    if (org) {
      const { error } = await supabase.from('profiles').insert({
        user_id: newUser.user.id,
        organization_id: org.id,
        role: 'admin',
        full_name: 'Demo Admin',
      })
      if (error) console.error('Profile error:', error.message)
    }
  }

  console.log(`✅ Usuario creado: ${EMAIL}`)
  console.log('\n🎉 Credenciales:')
  console.log(`   Email:    ${EMAIL}`)
  console.log(`   Password: ${PASSWORD}`)
  console.log('   URL:      http://localhost:3000/login')
}

main().catch(console.error)
