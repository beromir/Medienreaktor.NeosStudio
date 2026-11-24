import type { ItemInstance } from '@headless-tree/core'
import type * as React from 'react'
import type { NodeTypeMap } from '@/api/neos/endpoints/nodeTypes'
import { translate as t } from '@/lib/i18n'
import { NodeTypeIcon, resolveNodeTypeIconClass } from './nodeTypeIcon'
import type { AlphaRow } from './treeStyle'
import { nodeOfItem, type NodeTreeItem } from './useNodeTree'

/**
 * A node's alpha row: its type icon, and as the note "hidden" or - closed,
 * with its children loaded - how many it holds.
 */
export function alphaNodeRow(
  item: ItemInstance<NodeTreeItem>,
  nodeTypes: NodeTypeMap | undefined,
  childCount: number | null,
  extras: Pick<AlphaRow, 'actions' | 'onHover'> = {},
): AlphaRow | null {
  const node = nodeOfItem(item.getItemData())
  if (node === null) return null
  const hidden = node.isHidden
  return {
    icon: <AlphaTypeIcon nodeTypes={nodeTypes} nodeTypeName={node.nodeType} />,
    hidden,
    note: hidden
      ? t('tree.alpha.hidden', 'hidden')
      : item.isFolder() && !item.isExpanded() && childCount
        ? t('tree.alpha.inside', '{0} inside', [childCount])
        : null,
    ...extras,
  }
}

/**
 * The type icon of an alpha row: the node type's own, but no folders -
 * collections without an icon of their own get a frame (R34).
 */
export function AlphaTypeIcon({
  nodeTypes,
  nodeTypeName,
}: {
  nodeTypes: NodeTypeMap | undefined
  nodeTypeName: string
}) {
  if (/\bfa-folder/.test(resolveNodeTypeIconClass(nodeTypes, nodeTypeName)))
    return (
      <svg
        width="12"
        height="12"
        viewBox="0 0 12 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        aria-hidden
      >
        <rect x="1" y="2" width="10" height="8" rx="1.5" />
      </svg>
    )
  return (
    <NodeTypeIcon
      nodeTypes={nodeTypes}
      nodeTypeName={nodeTypeName}
      className="text-[0.75rem]!"
    />
  )
}

/** A hover action of an alpha row: inside the row's button, so a span. */
export function RowAction({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: (event: React.MouseEvent) => void
  children: React.ReactNode
}) {
  return (
    <span
      role="button"
      tabIndex={-1}
      aria-label={label}
      title={label}
      onClick={(event) => {
        event.stopPropagation()
        onClick(event)
      }}
      className="flex size-5.5 cursor-pointer items-center justify-center rounded-md text-shell-label hover:bg-shell-hover hover:text-shell-text"
    >
      {children}
    </span>
  )
}

export const RowPlusIcon = () => (
  <svg
    width="10"
    height="10"
    viewBox="0 0 14 14"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    aria-hidden
  >
    <path d="M7 1v12M1 7h12" />
  </svg>
)

export const RowMoreIcon = () => (
  <svg width="12" height="4" viewBox="0 0 14 4" aria-hidden>
    <circle cx="2" cy="2" r="1.4" fill="currentColor" />
    <circle cx="7" cy="2" r="1.4" fill="currentColor" />
    <circle cx="12" cy="2" r="1.4" fill="currentColor" />
  </svg>
)

export const RowEyeIcon = ({ off = false }: { off?: boolean }) => (
  <svg
    width="13"
    height="10"
    viewBox="0 0 15 12"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.3"
    aria-hidden
  >
    <path d="M1 6s2.5-4.5 6.5-4.5S14 6 14 6s-2.5 4.5-6.5 4.5S1 6 1 6z" />
    <circle cx="7.5" cy="6" r="1.8" />
    {off && <path d="M2 11L13 1" strokeLinecap="round" />}
  </svg>
)
