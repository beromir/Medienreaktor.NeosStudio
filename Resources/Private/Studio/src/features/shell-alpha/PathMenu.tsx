import * as React from 'react'
import { Menu as MenuPrimitive } from '@base-ui/react/menu'
import { useQuery } from '@tanstack/react-query'
import {
  DOCUMENT_NODE_TYPE,
  fetchChildren,
  useNodeAncestors,
} from '@/api/neos/endpoints/nodes'
import { isOfType, useNodeTypes } from '@/api/neos/endpoints/nodeTypes'
import { neosKeys } from '@/api/neos/keys'
import { type Node, nodeAddressOf } from '@/api/neos/schema'
import { useStudio } from '@/app/StudioContext'
import { NodeTypeIcon } from '@/features/tree/nodeTypeIcon'
import { translate as t } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { CheckIcon, FolderIcon, GlobeIcon } from './icons'

/** How a node is named in the shell: a page by its title, content by its type. */
export function useNodeName(node: Node): string {
  const { data: nodeTypes } = useNodeTypes()
  if (nodeTypes && isOfType(nodeTypes, node.nodeType, DOCUMENT_NODE_TYPE))
    return node.label || node.nodeAggregateId
  return nodeTypes?.get(node.nodeType)?.label ?? node.nodeType
}

/**
 * The selection path as a menu: the parents up to the page (the direct one
 * with ⌥↑), the node itself with a check, and its children. Picking an entry
 * selects it.
 */
export function PathMenu({
  node,
  trigger,
  side,
  align = 'start',
  sideOffset = 8,
}: {
  node: Node
  trigger: React.ReactElement<Record<string, unknown>>
  side: 'top' | 'bottom'
  align?: 'start' | 'end'
  sideOffset?: number
}) {
  const { data: nodeTypes } = useNodeTypes()
  const { inspectNode } = useStudio()
  const address = nodeAddressOf(node)
  const { data: ancestors } = useNodeAncestors(address)
  const isDocument = (entry: Node) =>
    nodeTypes !== undefined &&
    isOfType(nodeTypes, entry.nodeType, DOCUMENT_NODE_TYPE)
  const nodeIsDocument = isDocument(node)
  const { data: children } = useQuery({
    queryKey: [...neosKeys.nodes.node(address), 'alpha-path-children'],
    queryFn: () => fetchChildren(address),
  })
  const parent = nodeIsDocument ? null : (ancestors?.[0] ?? null)

  // Up to and including the page, outermost first.
  const path: Node[] = []
  if (!nodeIsDocument) {
    for (const ancestor of ancestors ?? []) {
      path.unshift(ancestor)
      if (isDocument(ancestor)) break
    }
  }
  const visibleChildren = (children ?? []).filter((child) => !isDocument(child))

  const row = (
    entry: Node,
    depth: number,
    kind: 'parent' | 'self' | 'child',
  ) => {
    const page = isDocument(entry)
    const label = page
      ? entry.label || entry.nodeAggregateId
      : kind === 'self'
        ? (nodeTypes?.get(entry.nodeType)?.label ?? entry.label)
        : entry.label || entry.name || entry.nodeAggregateId
    return (
      <MenuPrimitive.Item
        key={entry.nodeAggregateId}
        onClick={() => inspectNode(entry)}
        style={{ paddingLeft: `${0.625 + depth * 0.75}rem` }}
        className={cn(
          'flex h-8 shrink-0 cursor-default items-center gap-2 rounded-shell-control pr-2.5 type-shell-secondary outline-none select-none data-highlighted:bg-shell-hover',
          kind === 'self'
            ? 'font-semibold text-shell-accent-light'
            : page
              ? 'text-shell-muted'
              : 'text-shell-text',
        )}
      >
        {page ? (
          <GlobeIcon className="text-shell-muted" />
        ) : kind === 'self' ? (
          <NodeTypeIcon
            nodeTypes={nodeTypes}
            nodeTypeName={entry.nodeType}
            className="type-icon-s"
          />
        ) : entry.classification === 'tethered' ||
          (nodeTypes &&
            isOfType(
              nodeTypes,
              entry.nodeType,
              'Neos.Neos:ContentCollection',
            )) ? (
          <FolderIcon />
        ) : (
          <NodeTypeIcon
            nodeTypes={nodeTypes}
            nodeTypeName={entry.nodeType}
            className="type-icon-s text-shell-muted"
          />
        )}
        <span className="min-w-0 flex-1 truncate">{label}</span>
        {page && kind !== 'self' && (
          <span className="text-[0.6875rem] leading-3.5 text-[#5a5a5a]">
            {t('shellAlpha.page', 'page')}
          </span>
        )}
        {parent?.nodeAggregateId === entry.nodeAggregateId && (
          <span className="text-[0.6875rem] leading-3.5 text-shell-subtle">
            ⌥↑
          </span>
        )}
        {kind === 'self' && <CheckIcon />}
      </MenuPrimitive.Item>
    )
  }

  return (
    <MenuPrimitive.Root>
      <MenuPrimitive.Trigger render={trigger} />
      <MenuPrimitive.Portal>
        <MenuPrimitive.Positioner
          side={side}
          align={align}
          sideOffset={sideOffset}
          className="z-200 outline-none"
        >
          <MenuPrimitive.Popup className="flex max-h-(--available-height) w-65 origin-(--transform-origin) flex-col overflow-y-auto rounded-shell-surface border border-white/8 bg-shell-tile p-1 shadow-[0_0.75rem_1.875rem_#00000073] outline-none transition-[opacity,scale] duration-150 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
            {path.map((entry, depth) => row(entry, depth, 'parent'))}
            {row(node, path.length, 'self')}
            {visibleChildren.map((child) =>
              row(child, path.length + 1, 'child'),
            )}
          </MenuPrimitive.Popup>
        </MenuPrimitive.Positioner>
      </MenuPrimitive.Portal>
    </MenuPrimitive.Root>
  )
}
