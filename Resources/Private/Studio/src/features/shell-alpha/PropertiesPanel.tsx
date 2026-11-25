import type * as React from 'react'
import { useNodeTypes } from '@/api/neos/endpoints/nodeTypes'
import type { Node } from '@/api/neos/schema'
import { useStudio } from '@/app/StudioContext'
import { InspectorPanel } from '@/features/inspector/Inspector'
import { AlphaTypeIcon } from '@/features/tree/alphaRow'
import { translate as t } from '@/lib/i18n'
import { Chevron } from './icons'
import { PathMenu, useNodeName } from './PathMenu'
import { CloseAction } from './primitives'
import { useTooltip } from './Tooltip'

/** The page fields that lead the panel when the page itself is shown. */
const PAGE_LEAD = ['title', 'uriPathSegment', 'hiddenInMenu', '_hiddenInMenu']

/**
 * The right side: the selected element's settings, or the page's while the
 * page is selected. The fields scroll; the heading opens the selection's
 * path, so parents and children are a pick away.
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
          <CloseAction onClick={onClose} />
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
  const tooltip = useTooltip(t('shellAlpha.selectionPath', 'Selection path'))
  return (
    <>
      {tooltip.tooltip}
      <PathMenu
        node={node}
        side="bottom"
        sideOffset={4}
        trigger={
          <button
            type="button"
            className="flex h-8 min-w-0 cursor-pointer items-center gap-2 rounded-shell-control pr-2.5 pl-2 text-shell-text outline-none hover:bg-shell-ground focus-visible:ring-2 focus-visible:ring-shell-accent/60 data-popup-open:bg-shell-ground"
            {...tooltip.props}
          >
            <AlphaTypeIcon nodeTypes={nodeTypes} nodeTypeName={node.nodeType} />
            <span className="truncate text-[0.875rem] leading-4.5 font-semibold">
              {name}
            </span>
            <Chevron />
          </button>
        }
      />
    </>
  )
}
