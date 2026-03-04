'use client'

import { useEffect, useRef } from 'react'
import type { GraphNode, GraphEdge } from '@/types/dto'

interface CoPublicationGraphProps {
  nodes: GraphNode[]
  edges: GraphEdge[]
  height?: number
}

const GROUP_COLORS: Record<string, string> = {
  oficialismo: '#6674f1',
  oposicion: '#f43f5e',
  neutro: '#94a3b8',
  desconocido: '#64748b',
}

export function CoPublicationGraph({ nodes, edges, height = 500 }: CoPublicationGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const networkRef = useRef<unknown>(null)

  useEffect(() => {
    if (!containerRef.current || nodes.length === 0) return

    let cancelled = false

    Promise.all([import('vis-network'), import('vis-data')]).then(([{ Network }, { DataSet }]) => {
      if (cancelled || !containerRef.current) return

      const visNodes = new DataSet(
        nodes.map(n => ({
          id: n.id,
          label: `@${n.label}`,
          title: n.title,
          value: Math.max(n.value * 10 + 15, 20),
          color: {
            background: GROUP_COLORS[n.group] ?? '#6674f1',
            border: GROUP_COLORS[n.group] ?? '#6674f1',
            highlight: { background: '#fff', border: GROUP_COLORS[n.group] ?? '#6674f1' },
          },
          font: { color: '#fff', size: 11, face: 'Inter, sans-serif' },
        }))
      )

      const visEdges = new DataSet(
        edges.map((e, i) => ({
          id: i,
          from: e.from,
          to: e.to,
          value: e.value,
          color: { color: '#2a3150', highlight: '#6674f1' },
          width: Math.max(e.value * 0.5, 1),
        }))
      )

      const options = {
        physics: {
          enabled: true,
          barnesHut: { gravitationalConstant: -8000, springConstant: 0.001, springLength: 150 },
          stabilization: { iterations: 100 },
        },
        edges: {
          smooth: { enabled: true, type: 'continuous', roundness: 0.5 },
          selectionWidth: 2,
        },
        nodes: {
          shape: 'dot',
          borderWidth: 1,
          borderWidthSelected: 2,
        },
        interaction: {
          hover: true,
          navigationButtons: false,
          tooltipDelay: 200,
        },
      }

      networkRef.current = new Network(containerRef.current!, { nodes: visNodes, edges: visEdges }, options)
    })

    return () => {
      cancelled = true
      if (networkRef.current && typeof (networkRef.current as Record<string, unknown>).destroy === 'function') {
        (networkRef.current as { destroy: () => void }).destroy()
      }
    }
  }, [nodes, edges])

  if (nodes.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-500 text-sm">
        Sin datos de co-publicación. Ejecutá el seed con clusters de colaboración.
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      style={{ height, width: '100%' }}
      className="rounded-xl overflow-hidden bg-surface"
    />
  )
}
