import * as React from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import {
  CONTENT_NODE_TYPES,
  DOCUMENT_NODE_TYPE,
  fetchChildren,
  useNodeAncestors,
} from '@/api/neos/endpoints/nodes'
import {
  isOfType,
  type NodeTypeMap,
  useNodeTypes,
} from '@/api/neos/endpoints/nodeTypes'
import { neosKeys } from '@/api/neos/keys'
import { type Node, nodeAddressOf } from '@/api/neos/schema'
import { useStudio } from '@/app/StudioContext'
import { setPreviewChrome } from '@/features/preview/chromeStore'
import { AlphaTypeIcon } from '@/features/tree/alphaRow'
import { translate as t } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { TreeChevronIcon, UpArrowIcon } from './icons'
import { useNodeName } from './PathMenu'

/** Seven rows, always: the map never changes its height. */
const ROWS = 7
const MAX_CHILDREN = 3
const SIBLINGS_AROUND = 2

interface MapRow {
  node: Node
  depth: number
  open: boolean
  selected?: boolean
}

function useContentChildren(node: Node | null) {
  return useQuery({
    queryKey: node
      ? [...neosKeys.nodes.node(nodeAddressOf(node)), 'alpha-branch-children']
      : ['alpha-branch-children', null],
    queryFn: () => fetchChildren(nodeAddressOf(node!), CONTENT_NODE_TYPES),
    enabled: node !== null,
  })
}

/**
 * The branch around the selection (R30), at the bottom of the Properties
 * panel: the path above, the parent open, the selection among its nearest
 * siblings with up to three of its children, then the parent's next
 * siblings closed. What does not fit becomes "+ n more", which opens the
 * Outline.
 */
export function BranchMap({
  node,
  onShowOutline,
}: {
  node: Node
  onShowOutline: () => void
}) {
  const { selectedDocument, inspectNode } = useStudio()
  const { data: nodeTypes } = useNodeTypes()
  const isDocument = (entry: Node) =>
    nodeTypes !== undefined &&
    isOfType(nodeTypes, entry.nodeType, DOCUMENT_NODE_TYPE)
  const isPage = isDocument(node)

  const { data: ancestors } = useNodeAncestors(nodeAddressOf(node), !isPage)
  // Nearest first, up to and including the page.
  const above: Node[] = []
  if (!isPage) {
    for (const ancestor of ancestors ?? []) {
      above.push(ancestor)
      if (isDocument(ancestor)) break
    }
  }
  const parent = above[0] ?? null
  const grandparent = above[1] ?? null
  // The path line: from the page down to the grandparent.
  const path = above.slice(1).reverse()

  const { data: ownChildren = [] } = useContentChildren(node)
  const { data: siblings = [] } = useContentChildren(parent)
  const { data: parentSiblings = [] } = useContentChildren(
    grandparent && !isDocument(parent!) ? grandparent : null,
  )

  const rows: MapRow[] = []
  let more = 0
  if (isPage) {
    const budget = ROWS
    rows.push({ node, depth: 0, open: true, selected: true })
    const fits = ownChildren.length <= budget - 1
    const shown = ownChildren.slice(0, fits ? budget - 1 : budget - 2)
    more = ownChildren.length - shown.length
    rows.push(...shown.map((child) => ({ node: child, depth: 1, open: false })))
  } else if (parent) {
    const index = siblings.findIndex(
      (sibling) => sibling.nodeAggregateId === node.nodeAggregateId,
    )
    const after = parentSiblings.slice(
      parentSiblings.findIndex(
        (entry) => entry.nodeAggregateId === parent.nodeAggregateId,
      ) + 1,
    )
    const candidates =
      1 + ownChildren.length + Math.max(siblings.length - 1, 0) + after.length
    let budget = ROWS - (path.length > 0 ? 1 : 0) - 1
    if (candidates > budget) budget -= 1
    let left = budget - 1
    const children = ownChildren.slice(0, Math.min(MAX_CHILDREN, left))
    left -= children.length
    const before: Node[] = []
    const next: Node[] = []
    for (let step = 1; step <= SIBLINGS_AROUND && left > 0; step++) {
      const previous = index >= 0 ? siblings[index - step] : undefined
      if (previous && left > 0) {
        before.unshift(previous)
        left--
      }
      const following = index >= 0 ? siblings[index + step] : undefined
      if (following && left > 0) {
        next.push(following)
        left--
      }
    }
    const neighbours = after.slice(0, left)
    more =
      candidates -
      1 -
      children.length -
      before.length -
      next.length -
      neighbours.length
    rows.push({ node: parent, depth: 0, open: true })
    rows.push(
      ...before.map((entry) => ({ node: entry, depth: 1, open: false })),
    )
    rows.push({ node, depth: 1, open: children.length > 0, selected: true })
    rows.push(
      ...children.map((child) => ({ node: child, depth: 2, open: false })),
    )
    rows.push(...next.map((entry) => ({ node: entry, depth: 1, open: false })))
    rows.push(
      ...neighbours.map((entry) => ({ node: entry, depth: 0, open: false })),
    )
  }

  // "n inside" on the closed rows that have children.
  const closed = rows.filter((row) => !row.open && row.node.hasChildren)
  const counts = useQueries({
    queries: closed.map((row) => ({
      queryKey: [
        ...neosKeys.nodes.node(nodeAddressOf(row.node)),
        'alpha-branch-children',
      ],
      queryFn: () => fetchChildren(nodeAddressOf(row.node), CONTENT_NODE_TYPES),
    })),
  })
  const countOf = (entry: Node) => {
    const at = closed.findIndex(
      (row) => row.node.nodeAggregateId === entry.nodeAggregateId,
    )
    return at === -1 ? null : (counts[at]?.data?.length ?? null)
  }

  React.useEffect(() => () => setPreviewChrome({ hoverNode: null }), [])

  return (
    <div
      aria-label={t('shellAlpha.branchMap', 'Branch')}
      className="flex h-56.5 shrink-0 flex-col gap-0.5 border-t border-shell-tooltip-border p-2"
    >
      {path.length > 0 && (
        <PathLine path={path} page={selectedDocument} onSelect={inspectNode} />
      )}
      {rows.map((row) => (
        <MapRowButton
          key={row.node.nodeAggregateId}
          row={row}
          nodeTypes={nodeTypes}
          count={row.open ? null : countOf(row.node)}
          onSelect={() => inspectNode(row.node)}
        />
      ))}
      {more > 0 && (
        <button
          type="button"
          onClick={onShowOutline}
          className="flex h-6.5 shrink-0 cursor-pointer items-center rounded-shell-control pl-9 type-shell-secondary text-shell-subtle outline-none hover:bg-shell-ground hover:text-shell-text focus-visible:ring-2 focus-visible:ring-shell-accent/60"
        >
          {t('shellAlpha.branchMore', '+ {0} more', [more])}
        </button>
      )}
    </div>
  )
}

function PathLine({
  path,
  page,
  onSelect,
}: {
  /** From the page down; the last one is the level above. */
  path: Node[]
  page: Node | null
  onSelect: (node: Node) => void
}) {
  // Higher levels fold into "…": the page and the two nearest stay.
  const shown: (Node | null)[] =
    path.length > 3 ? [path[0]!, null, ...path.slice(-2)] : path
  const up = path[path.length - 1]!
  return (
    <div className="flex h-6.5 shrink-0 items-center gap-1.5 overflow-hidden rounded-shell-control px-2 type-shell-secondary text-shell-muted">
      <button
        type="button"
        onClick={() => onSelect(up)}
        aria-label={t('shellAlpha.selectParent', 'Select the parent element')}
        className="flex size-4 shrink-0 cursor-pointer items-center justify-center rounded text-shell-subtle outline-none hover:text-shell-text focus-visible:ring-2 focus-visible:ring-shell-accent/60"
      >
        <UpArrowIcon />
      </button>
      <span className="flex min-w-0 items-center gap-1 overflow-hidden whitespace-nowrap">
        {shown.map((entry, index) => (
          <React.Fragment key={entry?.nodeAggregateId ?? `fold-${index}`}>
            {index > 0 && <span aria-hidden>›</span>}
            {entry ? (
              <PathSegment
                node={entry}
                isPage={entry.nodeAggregateId === page?.nodeAggregateId}
                onSelect={() => onSelect(entry)}
              />
            ) : (
              <span>…</span>
            )}
          </React.Fragment>
        ))}
      </span>
    </div>
  )
}

function PathSegment({
  node,
  isPage,
  onSelect,
}: {
  node: Node
  isPage: boolean
  onSelect: () => void
}) {
  const name = useNodeName(node)
  return (
    <button
      type="button"
      onClick={onSelect}
      className="min-w-0 cursor-pointer truncate outline-none last:shrink first:shrink-0 hover:text-shell-text focus-visible:underline"
    >
      {isPage ? name : node.label || name}
    </button>
  )
}

function MapRowButton({
  row,
  nodeTypes,
  count,
  onSelect,
}: {
  row: MapRow
  nodeTypes: NodeTypeMap | undefined
  count: number | null
  onSelect: () => void
}) {
  const { node, selected } = row
  const name = useNodeName(node)
  const label = node.label || name
  const expandable = row.open || node.hasChildren === true
  return (
    <button
      type="button"
      onClick={onSelect}
      onMouseEnter={() => setPreviewChrome({ hoverNode: node.nodeAggregateId })}
      onMouseLeave={() => setPreviewChrome({ hoverNode: null })}
      aria-current={selected || undefined}
      className={cn(
        'flex h-6.5 shrink-0 cursor-pointer items-center gap-1.5 rounded-shell-control pr-2 text-left type-shell-secondary outline-none focus-visible:ring-2 focus-visible:ring-shell-accent/60',
        selected
          ? 'bg-shell-accent-tint font-medium text-shell-text'
          : node.isHidden
            ? 'text-shell-icon hover:bg-shell-ground'
            : 'text-shell-label hover:bg-shell-ground hover:text-shell-text',
      )}
      style={{ paddingLeft: `${0.5 + row.depth}rem` }}
    >
      <span className="flex w-2.5 shrink-0 justify-center text-shell-subtle">
        {expandable && <TreeChevronIcon open={row.open} />}
      </span>
      <span
        className={cn(
          'flex w-3 shrink-0 justify-center text-[0.75rem] leading-none',
          selected
            ? 'text-shell-accent-pale'
            : node.isHidden
              ? 'text-shell-disabled'
              : 'text-shell-muted',
        )}
      >
        <AlphaTypeIcon nodeTypes={nodeTypes} nodeTypeName={node.nodeType} />
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {node.isHidden ? (
        <span className="shrink-0 text-[0.6875rem] text-shell-disabled">
          {t('tree.alpha.hidden', 'hidden')}
        </span>
      ) : (
        count !== null &&
        count > 0 && (
          <span className="shrink-0 text-[0.6875rem] text-shell-icon">
            {t('tree.alpha.inside', '{0} inside', [count])}
          </span>
        )
      )}
    </button>
  )
}
