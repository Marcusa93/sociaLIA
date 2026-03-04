import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, Badge } from '@/components/ui'
import { CoPublicationGraph } from '@/components/graph/CoPublicationGraph'
import { buildCoPublicationGraph, getTopByDegree } from '@/lib/analytics/graph'

export const metadata = { title: 'Red de Co-publicación' }

export default async function GraphPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  const orgId = profile?.organization_id
  if (!orgId) redirect('/login')

  const [{ data: posts }, { data: accounts }] = await Promise.all([
    supabase
      .from('posts')
      .select('account_id, collab_group_id')
      .eq('org_id', orgId)
      .not('collab_group_id', 'is', null),
    supabase
      .from('accounts')
      .select('id, handle, display_name, affinity')
      .eq('org_id', orgId),
  ])

  const { nodes, edges } = buildCoPublicationGraph(
    (posts ?? []).map(p => ({ account_id: p.account_id, collab_group_id: p.collab_group_id! })),
    (accounts ?? []).map(a => ({
      id: a.id,
      handle: a.handle,
      display_name: a.display_name,
      affinity: a.affinity,
    }))
  )

  const topByDegree = getTopByDegree(nodes, 10)

  const affinityColors: Record<string, string> = {
    oficialismo: 'info',
    oposicion: 'error',
    neutro: 'default',
    desconocido: 'default',
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Red de Co-publicación</h1>
        <p className="text-sm text-slate-400 mt-1">
          {nodes.length} nodos · {edges.length} aristas · Clusters colaborativos
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Graph */}
        <Card className="xl:col-span-3 p-4">
          <CoPublicationGraph nodes={nodes} edges={edges} height={520} />
        </Card>

        {/* Sidebar ranking */}
        <div className="space-y-4">
          <Card className="p-4">
            <h2 className="text-sm font-semibold text-white mb-3">Top por Degree</h2>
            {topByDegree.length === 0 ? (
              <p className="text-xs text-slate-500">Sin datos de co-publicación</p>
            ) : (
              <div className="space-y-2">
                {topByDegree.map((node, i) => (
                  <div key={node.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs text-slate-500 w-4 flex-shrink-0">{i + 1}</span>
                      <span className="text-sm text-white truncate">@{node.label}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      <Badge
                        variant={affinityColors[node.group] as 'default' | 'info' | 'error'}
                        size="sm"
                      >
                        {node.value}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-4">
            <h2 className="text-sm font-semibold text-white mb-3">Leyenda</h2>
            <div className="space-y-2">
              {[
                { label: 'Oficialismo', color: '#6674f1' },
                { label: 'Oposición', color: '#f43f5e' },
                { label: 'Neutro', color: '#94a3b8' },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ background: item.color }} />
                  <span className="text-xs text-slate-400">{item.label}</span>
                </div>
              ))}
              <div className="pt-2 text-xs text-slate-500">
                Tamaño del nodo = degree (conexiones)
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
