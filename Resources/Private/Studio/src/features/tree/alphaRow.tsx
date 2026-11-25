import type { ItemInstance } from '@headless-tree/core'
import type * as React from 'react'
import type { NodeTypeMap } from '@/api/neos/endpoints/nodeTypes'
import { translate as t } from '@/lib/i18n'
import { DOCUMENT_NODE_TYPE } from '@/api/neos/endpoints/nodes'
import { isOfType } from '@/api/neos/endpoints/nodeTypes'
import { ActionIcon, TypeIcon } from '@/features/shell-alpha/icons'
import { Tooltip } from '@/features/shell-alpha/Tooltip'
import type { TypeIconName } from '@/lib/iconSet'
import { cn } from '@/lib/utils'
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
    icon: (
      <AlphaTypeIcon
        nodeTypes={nodeTypes}
        nodeTypeName={node.nodeType}
        hidden={hidden}
      />
    ),
    hidden,
    note: hidden
      ? t('tree.alpha.hidden', 'hidden')
      : item.isFolder() && !item.isExpanded() && childCount
        ? t('tree.alpha.inside', '{0} inside', [childCount])
        : null,
    ...extras,
  }
}

/** Node type icons the set draws itself, by the configured icon. */
const SET_ICONS: [RegExp, TypeIconName][] = [
  [/\bfa-(header|heading)\b/, 'headline'],
  [/\bfa-(file-text|file-lines|paragraph|align-left|font)\b/, 'text'],
  [/\bfa-(columns|table-columns)\b/, 'columns'],
  [/\bfa-folder/, 'area'],
]

/**
 * The type icon of an alpha row: the set's own for pages (home for the
 * site's home), areas, columns, headlines and text, else the node type's
 * icon at the same size. Hidden ones are dashed.
 */
export function AlphaTypeIcon({
  nodeTypes,
  nodeTypeName,
  hidden = false,
}: {
  nodeTypes: NodeTypeMap | undefined
  nodeTypeName: string
  hidden?: boolean
}) {
  const iconClass = resolveNodeTypeIconClass(nodeTypes, nodeTypeName)
  const document =
    nodeTypes !== undefined &&
    isOfType(nodeTypes, nodeTypeName, DOCUMENT_NODE_TYPE)
  const name: TypeIconName | undefined = document
    ? /\bfa-(globe|home|house)\b/.test(iconClass)
      ? 'home'
      : 'page'
    : SET_ICONS.find(([pattern]) => pattern.test(iconClass))?.[1]
  if (name)
    return (
      <TypeIcon name={name} strokeDasharray={hidden ? '2 1.6' : undefined} />
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
  open = false,
  onClick,
  children,
}: {
  label: string
  /** Its menu is open. */
  open?: boolean
  onClick: (event: React.MouseEvent) => void
  children: React.ReactNode
}) {
  return (
    <Tooltip label={label}>
      <span
        role="button"
        tabIndex={-1}
        aria-label={label}
        onClick={(event) => {
          event.stopPropagation()
          onClick(event)
        }}
        className={cn(
          'flex size-5.5 shrink-0 cursor-pointer items-center justify-center rounded-md',
          open
            ? 'bg-shell-active text-shell-text'
            : 'text-shell-muted hover:bg-shell-active hover:text-shell-text',
        )}
      >
        {children}
      </span>
    </Tooltip>
  )
}

export const RowPlusIcon = () => <ActionIcon name="plus" />

export const RowMoreIcon = () => <ActionIcon name="more" />
