import type * as React from 'react'
import { useNodeTypes } from '@/api/neos/endpoints/nodeTypes'
import { useStudio } from '@/app/StudioContext'
import { InspectorPanel } from '@/features/inspector/Inspector'
import { NodeTypeIcon } from '@/features/tree/nodeTypeIcon'
import { translate as t } from '@/lib/i18n'
import { ChevronDownIcon, CloseIcon } from './icons'
import { PathMenu, useNodeName } from './PathMenu'
import { IconButton } from './primitives'

/** The page fields that lead the panel when the page itself is shown. */
const PAGE_LEAD = ['title', 'uriPathSegment', 'hiddenInMenu', '_hiddenInMenu']

/**
 * The tray's fields, kept open on the left ("Keep open"): the inspector of
 * the selected element, or of the page while nothing is selected. The header
 * names the node and opens the path menu over the panel; header and fields
 * stay where they are when the selection changes.
 */
export function PropertiesPanel({
  pin,
  onClose,
}: {
  pin: React.ReactNode
  onClose: () => void
}) {
  const { inspectedNode, selectedDocument, nodeEdited } = useStudio()
  const node = inspectedNode ?? selectedDocument
  const isPage =
    node !== null &&
    selectedDocument !== null &&
    node.nodeAggregateId === selectedDocument.nodeAggregateId

  return (
    <aside
      aria-label={t('shellAlpha.properties', 'Properties')}
      className="flex w-75 shrink-0 flex-col overflow-hidden rounded-shell-surface border border-shell-border bg-shell-surface"
    >
      <div className="flex h-13 shrink-0 items-center justify-between px-2">
        {node ? <Header key="header" /> : <span />}
        <div className="flex shrink-0 items-center gap-0.5">
          {pin}
          <IconButton
            size="sm"
            className="text-shell-muted"
            onClick={onClose}
            aria-label={t('common.close', 'Close')}
          >
            <CloseIcon />
          </IconButton>
        </div>
      </div>
      {node && (
        <InspectorPanel
          node={node}
          onNodeEdited={nodeEdited}
          layout="panel"
          lead={
            isPage
              ? {
                  label: t('shellAlpha.pageGroup', 'Page'),
                  properties: PAGE_LEAD,
                }
              : undefined
          }
        />
      )}
    </aside>
  )
}

function Header() {
  const { inspectedNode, selectedDocument } = useStudio()
  const node = (inspectedNode ?? selectedDocument)!
  const { data: nodeTypes } = useNodeTypes()
  const name = useNodeName(node)
  return (
    <PathMenu
      node={node}
      side="bottom"
      sideOffset={2}
      trigger={
        <button
          type="button"
          title={t('shellAlpha.selectionPath', 'Selection path')}
          className="flex h-8 min-w-0 cursor-pointer items-center gap-2 rounded-shell-control pr-2.5 pl-2 text-shell-text outline-none hover:bg-shell-hover focus-visible:ring-2 focus-visible:ring-shell-accent/60 data-popup-open:bg-shell-hover"
        >
          <NodeTypeIcon
            nodeTypes={nodeTypes}
            nodeTypeName={node.nodeType}
            className="type-icon-s"
          />
          <span className="truncate text-[0.875rem] leading-4.5 font-semibold">
            {name}
          </span>
          <ChevronDownIcon className="text-shell-muted" />
        </button>
      }
    />
  )
}
