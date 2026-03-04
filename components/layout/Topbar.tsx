import { createClient } from '@/lib/supabase/server'

const pageTitles: Record<string, string> = {
  '/overview': 'Overview',
  '/universe': 'Universo de Cuentas',
  '/collection': 'Recolección',
  '/analysis': 'Análisis',
  '/analysis/graph': 'Red de Co-publicación',
  '/reports': 'Reportes',
  '/chat': 'Chat Analítico',
}

interface TopbarProps {
  pathname: string
}

export async function Topbar({ pathname }: TopbarProps) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const title = Object.entries(pageTitles).find(([p]) => pathname.startsWith(p))?.[1] ?? 'SociaLIA'

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? 'U'

  return (
    <header className="h-14 border-b border-surface-border bg-surface-secondary/80 backdrop-blur-sm flex items-center justify-between px-6 sticky top-0 z-20">
      <h1 className="text-sm font-semibold text-white">{title}</h1>

      <div className="flex items-center gap-3">
        <div className="text-xs text-slate-400">{user?.email}</div>
        <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-white text-xs font-bold">
          {initials}
        </div>
      </div>
    </header>
  )
}
