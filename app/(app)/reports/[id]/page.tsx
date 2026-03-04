import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { Button } from '@/components/ui'
import Link from 'next/link'

export default async function ReportViewPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: report } = await supabase
    .from('reports')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!report) notFound()
  if (!report.html_content) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-slate-400 mb-4">Reporte en proceso de generación...</div>
          <Link href="/reports"><Button variant="secondary" size="sm">Volver a reportes</Button></Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link href="/reports">
          <Button variant="ghost" size="sm">← Volver a reportes</Button>
        </Link>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => window.print()}
          >
            Imprimir / PDF
          </Button>
        </div>
      </div>
      <div className="bg-white rounded-2xl overflow-hidden shadow-xl">
        <iframe
          srcDoc={report.html_content}
          className="w-full"
          style={{ height: 'calc(100vh - 120px)', border: 'none' }}
          title="Reporte"
        />
      </div>
    </div>
  )
}
