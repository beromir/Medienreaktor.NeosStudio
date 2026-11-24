import type * as React from 'react'
import { useNodeTypes } from '@/api/neos/endpoints/nodeTypes'
import type { Node } from '@/api/neos/schema'
import { useStudio } from '@/app/StudioContext'
import { InspectorPanel } from '@/features/inspector/Inspector'
import { NodeTypeIcon } from '@/features/tree/nodeTypeIcon'
import { translate as t } from '@/lib/i18n'
import { CloseIcon } from './icons'
import { useNodeName } from './PathMenu'
import { IconButton } from './primitives'

/** The page fields that lead the panel when the page itself is shown. */
const PAGE_LEAD = ['title', 'uriPathSegment', 'hiddenInMenu', '_hiddenInMenu']

/**
 * The right side: the selected element's settings, or the page's while the
 * page is selected. The fields scroll, the header stays where it is when
 * the selection changes.
 */
export function PropertiesPanel({
  className,
  pin,
  onClose,
}: {
  className: string
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
      className={className}
    >
      <div className="flex h-13 shrink-0 items-center justify-between gap-2 px-2">
        {node ? <Header node={node} /> : <span />}
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

function Header({ node }: { node: Node }) {
  const { data: nodeTypes } = useNodeTypes()
  const name = useNodeName(node)
  return (
    <div className="flex h-8 min-w-0 items-center gap-2 pr-2.5 pl-2 text-shell-text">
      <NodeTypeIcon
        nodeTypes={nodeTypes}
        nodeTypeName={node.nodeType}
        className="type-icon-s"
      />
      <span className="truncate text-[0.875rem] leading-4.5 font-semibold">
        {name}
      </span>
    </div>
  )
}
