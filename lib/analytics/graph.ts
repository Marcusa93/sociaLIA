import type { GraphNode, GraphEdge } from '@/types/dto'

interface PostWithCollab {
  account_id: string
  collab_group_id: string
}

interface AccountInfo {
  id: string
  handle: string
  display_name: string | null
  affinity: string | null
}

/**
 * Build graph nodes and edges from co-publication data
 */
export function buildCoPublicationGraph(
  posts: PostWithCollab[],
  accounts: AccountInfo[]
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const accountMap = new Map(accounts.map(a => [a.id, a]))

  // Group posts by collab_group_id
  const collabGroups = new Map<string, Set<string>>()
  for (const post of posts) {
    if (!post.collab_group_id) continue
    const group = collabGroups.get(post.collab_group_id) ?? new Set<string>()
    group.add(post.account_id)
    collabGroups.set(post.collab_group_id, group)
  }

  // Build edges from co-publications
  const edgeMap = new Map<string, number>()
  for (const [, accountIds] of collabGroups) {
    const ids = Array.from(accountIds)
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const [a, b] = [ids[i], ids[j]].sort()
        const key = `${a}::${b}`
        edgeMap.set(key, (edgeMap.get(key) ?? 0) + 1)
      }
    }
  }

  // Compute degree for each account
  const degreeMap = new Map<string, number>()
  for (const key of edgeMap.keys()) {
    const [a, b] = key.split('::')
    degreeMap.set(a, (degreeMap.get(a) ?? 0) + 1)
    degreeMap.set(b, (degreeMap.get(b) ?? 0) + 1)
  }

  // Build nodes (only accounts that appear in at least one collab)
  const accountsInGraph = new Set<string>()
  for (const key of edgeMap.keys()) {
    const [a, b] = key.split('::')
    accountsInGraph.add(a)
    accountsInGraph.add(b)
  }

  const nodes: GraphNode[] = Array.from(accountsInGraph)
    .map(id => {
      const acc = accountMap.get(id)
      const degree = degreeMap.get(id) ?? 0
      return {
        id,
        label: acc?.handle ?? id,
        value: degree,
        group: acc?.affinity ?? 'neutro',
        title: `${acc?.display_name ?? acc?.handle ?? id}\nDegree: ${degree}`,
      }
    })
    .sort((a, b) => b.value - a.value)

  const edges: GraphEdge[] = Array.from(edgeMap.entries()).map(([key, weight]) => {
    const [from, to] = key.split('::')
    return { from, to, value: weight }
  })

  return { nodes, edges }
}

/**
 * Get top N accounts by degree centrality
 */
export function getTopByDegree(nodes: GraphNode[], n = 10): GraphNode[] {
  return [...nodes].sort((a, b) => b.value - a.value).slice(0, n)
}
