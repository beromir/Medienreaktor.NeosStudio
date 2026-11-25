import * as React from 'react'
import { nodeAddressOf, type Node } from '@/api/neos/schema'
import { useStudio } from '@/app/StudioContext'
import { useNodeEditable } from '@/features/access/useAccess'
import {
  InsertNodeDialog,
  type InsertRequest,
} from '@/features/creation/InsertNodeDialog'
import { fetchNode } from '@/api/neos/endpoints/nodes'
import { SiteDocumentTree } from '@/features/panels/builtin'
import { requestPanelReveal } from '@/features/panels/reveal'
import { DocumentSearchList } from '@/features/tree/DocumentSearchList'
import { translate as t } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { PlusIcon, SearchIcon } from './icons'

/** The filter's search cadence, as in the Documents panel. */
const FILTER_DEBOUNCE_MS = 300

/**
 * The breadcrumb's page dropdown (R33): a filter, the site's documents
 * with hover actions and drag to reorder, "New page" at the bottom. A pick
 * closes it (onOpened).
 */
export function PagesBody({ onOpened }: { onOpened?: () => void }) {
  const {
    site,
    workspaceName,
    dimensionSpacePoint,
    selectedDocument,
    selectDocument,
    nodesEdited,
  } = useStudio()
  const [term, setTerm] = React.useState('')
  const [debounced, setDebounced] = React.useState('')
  React.useEffect(() => {
    const timer = setTimeout(
      () => setDebounced(term.trim()),
      FILTER_DEBOUNCE_MS,
    )
    return () => clearTimeout(timer)
  }, [term])
  const [request, setRequest] = React.useState<InsertRequest | null>(null)
  const canCreate = useNodeEditable(selectedDocument, 'createNodes')

  const open = (document: Node) => {
    selectDocument(document)
    requestPanelReveal('visual-editor')
    onOpened?.()
  }
  const newPage = () => {
    if (!selectedDocument || !site) return
    setRequest({
      referenceAddress: nodeAddressOf(selectedDocument),
      // The site node must not get siblings (that would be a new site).
      parentAddress:
        selectedDocument.nodeAggregateId === site.nodeAggregateId
          ? null
          : undefined,
      defaultMode: 'inside',
    })
  }

  return (
    <>
      <div className="shrink-0 px-2 pb-2">
        <label className="flex h-8 items-center gap-2 rounded-shell-control border border-shell-border-strong bg-shell-input px-2.5 text-shell-icon focus-within:border-shell-focus">
          <SearchIcon width={12} height={12} strokeWidth={1.4} />
          <input
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder={t('shellAlpha.filterPages', 'Filter pages')}
            aria-label={t('shellAlpha.filterPages', 'Filter pages')}
            className="min-w-0 flex-1 bg-transparent type-shell-control text-shell-text outline-none placeholder:text-shell-disabled"
          />
        </label>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-2 pb-2">
        {debounced !== '' && site && workspaceName && dimensionSpacePoint && (
          <DocumentSearchList
            site={site}
            workspaceName={workspaceName}
            dimensionSpacePoint={dimensionSpacePoint}
            term={debounced}
            nodeTypeFilter={[]}
            selectedAddress={
              selectedDocument ? nodeAddressOf(selectedDocument) : null
            }
            onSelect={open}
          />
        )}
        {/* Kept mounted while filtering, so clearing the filter returns to
            the tree as it was left. */}
        <div
          className={cn(
            'flex min-h-0 flex-1 flex-col',
            debounced !== '' && 'hidden',
          )}
        >
          <SiteDocumentTree onOpen={open} onCreate={setRequest} onCreateChild />
        </div>
      </div>
      <button
        type="button"
        onClick={newPage}
        disabled={!selectedDocument || !canCreate}
        className="flex h-11 shrink-0 cursor-pointer items-center gap-2 border-t border-shell-tooltip-border px-3.5 text-left type-shell-control text-shell-label outline-none hover:text-shell-text focus-visible:bg-shell-ground disabled:cursor-default disabled:text-shell-disabled"
      >
        <PlusIcon width={11} height={11} strokeWidth={1.8} />
        {t('shellAlpha.newPage', 'New page')}
      </button>
      <InsertNodeDialog
        request={request}
        role="document"
        onCreated={(address, creation) => {
          setRequest(null)
          nodesEdited([creation.parentAddress])
          fetchNode(address)
            .then(selectDocument)
            .catch(() => {
              /* fine - the tree refresh alone shows the new page */
            })
        }}
        onClose={() => setRequest(null)}
      />
    </>
  )
}
