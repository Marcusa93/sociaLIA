import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(process.cwd(), '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const EMAIL = 'admin@demo.com'
const PASSWORD = 'SociaLIA2025!'

async function linkToOrg(userId: string) {
  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('slug', 'socialía-demo')
    .single()

  if (!org) {
    console.error('❌ Org demo no encontrada. Corre pnpm seed primero.')
    return
  }

  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', userId)
    .single()

  if (existing) {
    console.log('✅ Perfil ya vinculado a org demo')
  } else {
    const { error } = await supabase.from('profiles').insert({
      user_id: userId,
      organization_id: org.id,
      role: 'admin',
      full_name: 'Demo Admin',
    })
    if (error) console.error('❌ Error creando perfil:', error.message)
    else console.log('✅ Perfil creado y vinculado a org demo')
  }

  console.log('\n🎉 Credenciales:')
  console.log(`   Email:    ${EMAIL}`)
  console.log(`   Password: ${PASSWORD}`)
  console.log('   URL:      http://localhost:3000/login')
}

async function main() {
  const { data: user, error } = await supabase.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
  })

  if (error) {
    if (error.message.includes('already been registered') || error.message.includes('already exists')) {
      console.log('ℹ️  Usuario ya existe, buscando...')
      const { data: list } = await supabase.auth.admin.listUsers()
      const existing = list?.users?.find(u => u.email === EMAIL)
      if (existing) await linkToOrg(existing.id)
    } else {
      console.error('❌ Error:', error.message)
    }
  } else {
    console.log(`✅ Usuario creado: ${user.user.email}`)
    await linkToOrg(user.user.id)
  }
}

main().catch(console.error)
