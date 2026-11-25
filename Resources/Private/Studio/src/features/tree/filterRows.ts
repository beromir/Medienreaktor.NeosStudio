/** A node as the filter sees it: its id and its ancestors, nearest first. */
export interface FilterHit<T> {
  nodeAggregateId: string
  node: T
  ancestors: ReadonlyArray<{ nodeAggregateId: string; node: T }>
}

/** A row of a filtered tree: a match, or a parent kept for context. */
export interface FilterRow<T> {
  nodeAggregateId: string
  node: T
  depth: number
  match: boolean
  /** Rows below it follow: drawn open. */
  parent: boolean
}

/**
 * The rows of a filtered tree: every hit in the given (tree) order, after
 * those of its parents below `rootId` not listed yet. Depth 0 is the first
 * level below the root; without `rootId` the outermost ancestor is depth 0.
 */
export function filterRows<T>(
  hits: readonly FilterHit<T>[],
  rootId: string | null = null,
): FilterRow<T>[] {
  const rows: FilterRow<T>[] = []
  const listed = new Map<string, FilterRow<T>>()
  for (const hit of hits) {
    const path = [...hit.ancestors].reverse()
    const start =
      rootId === null
        ? 0
        : path.findIndex((ancestor) => ancestor.nodeAggregateId === rootId) + 1
    if (rootId !== null && start === 0) continue
    const chain = [...path.slice(start), hit]
    chain.forEach((entry, depth) => {
      const last = depth === chain.length - 1
      const existing = listed.get(entry.nodeAggregateId)
      if (existing) {
        if (last) existing.match = true
        else existing.parent = true
        return
      }
      const row: FilterRow<T> = {
        nodeAggregateId: entry.nodeAggregateId,
        node: entry.node,
        depth,
        match: last,
        parent: !last,
      }
      listed.set(entry.nodeAggregateId, row)
      rows.push(row)
    })
  }
  return rows
}

/** Whether a label contains the term, case-insensitively. */
export function labelMatches(label: string, term: string): boolean {
  const needle = term.trim().toLowerCase()
  return needle !== '' && label.toLowerCase().includes(needle)
}
