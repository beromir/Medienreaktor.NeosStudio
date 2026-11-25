import * as React from 'react'
import {
  CONTENT_NODE_TYPES,
  DOCUMENT_NODE_TYPE,
  fetchNode,
  useFilteredDescendants,
} from '@/api/neos/endpoints/nodes'
import { isOfType, useNodeTypes } from '@/api/neos/endpoints/nodeTypes'
import { siteNodeAddress } from '@/api/neos/endpoints/sites'
import { type Node, nodeAddressOf } from '@/api/neos/schema'
import { useStudio } from '@/app/StudioContext'
import { nodeAccessState } from '@/features/access/rules'
import { useAccess, useNodeEditable } from '@/features/access/useAccess'
import {
  InsertNodeDialog,
  type InsertRequest,
} from '@/features/creation/InsertNodeDialog'
import { PageOutline, SiteDocumentTree } from '@/features/panels/builtin'
import { requestPanelReveal } from '@/features/panels/reveal'
import { AlphaTypeIcon } from '@/features/tree/alphaRow'
import {
  type FilterRow,
  filterRows,
  labelMatches,
} from '@/features/tree/filterRows'
import { translate as t } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { requestAdd } from './addRequest'
import { clampPagesHeight, type StructureLayout } from './dock'
import { ActionIcon, Chevron } from './icons'
import { useStructureLayout } from './preferences'
import { CloseAction, HeaderAction, HeaderDivider } from './primitives'
import { highlightParts, treeOrder } from './searchText'
import { useChildPositions } from './useSiteSearch'

/** The Pages filter's search cadence, as in the Documents panel. */
const FILTER_DEBOUNCE_MS = 300
/** What the Pages handle leaves the Outline below its header: two rows. */
const OUTLINE_ROWS = 2 * 28 + 2
const HEADER = 44
const HANDLE = 9
const SECTION_PADDING = 8

/**
 * Pages and Outline in one docked panel (R41-R44): Pages on top, small and
 * resizable, the Outline below with the rest. Each section folds with the
 * chevron in its header and filters in place; the sizes and folds are the
 * user's.
 */
export function StructurePanel({
  className,
  onClose,
}: {
  className: string
  onClose: () => void
}) {
  const [layout, setLayout] = useStructureLayout()
  const [pagesFilter, setPagesFilter] = React.useState<string | null>(null)
  const [outlineFilter, setOutlineFilter] = React.useState<string | null>(null)
  const [collapseAll, setCollapseAll] = React.useState(0)
  const [dragHeight, setDragHeight] = React.useState<number | null>(null)
  const panelRef = React.useRef<HTMLElement>(null)
  const update = (change: Partial<StructureLayout>) =>
    setLayout({ ...layout, ...change })

  const pagesOpen = !layout.pagesFolded
  const outlineOpen = !layout.outlineFolded
  const pagesHeight = dragHeight ?? layout.pagesHeight

  // Esc closes the filter first, then the panel - unless the shell's own
  // Esc already did something with it.
  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== 'Escape' || event.defaultPrevented) return
    event.preventDefault()
    const section = (event.target as HTMLElement)
      .closest('[data-section]')
      ?.getAttribute('data-section')
    if (
      outlineFilter !== null &&
      (section === 'outline' || pagesFilter === null)
    )
      setOutlineFilter(null)
    else if (pagesFilter !== null) setPagesFilter(null)
    else onClose()
  }

  const startResize = (event: React.PointerEvent) => {
    const panel = panelRef.current
    if (!panel) return
    event.preventDefault()
    const startY = event.clientY
    const start = pagesHeight
    const max =
      panel.clientHeight -
      2 * HEADER -
      HANDLE -
      2 * SECTION_PADDING -
      OUTLINE_ROWS
    let height = start
    const move = (moveEvent: PointerEvent) => {
      height = clampPagesHeight(start + moveEvent.clientY - startY, max)
      setDragHeight(height)
    }
    const end = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', end)
      window.removeEventListener('pointercancel', end)
      setDragHeight(null)
      if (height !== layout.pagesHeight) update({ pagesHeight: height })
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', end)
  }

  return (
    <aside
      ref={panelRef}
      aria-label={t('shellAlpha.structure', 'Pages and outline')}
      className={className}
      onKeyDown={onKeyDown}
    >
      <PagesSection
        open={pagesOpen}
        onToggle={() => update({ pagesFolded: pagesOpen })}
        filter={pagesFilter}
        onFilterChange={setPagesFilter}
        onClose={onClose}
        bodyStyle={
          outlineOpen
            ? { height: pagesHeight + SECTION_PADDING, flex: 'none' }
            : undefined
        }
      />
      {pagesOpen && outlineOpen ? (
        <div
          role="separator"
          aria-orientation="horizontal"
          aria-label={t('shellAlpha.resizePages', 'Resize pages')}
          onPointerDown={startResize}
          className="relative flex h-2.25 shrink-0 cursor-row-resize touch-none items-center justify-center"
        >
          <span className="absolute inset-x-0 top-1 h-px bg-shell-tooltip-border" />
          <span className="relative h-0.75 w-7 rounded-xs bg-shell-faint" />
        </div>
      ) : (
        <div className="h-px shrink-0 bg-shell-tooltip-border" />
      )}
      <OutlineSection
        open={outlineOpen}
        onToggle={() => update({ outlineFolded: outlineOpen })}
        filter={outlineFilter}
        onFilterChange={setOutlineFilter}
        collapseAll={collapseAll}
        onCollapseAll={() => setCollapseAll((count) => count + 1)}
      />
    </aside>
  )
}

function SectionHeader({
  title,
  open,
  onToggle,
  aside,
  actions,
}: {
  title: string
  open: boolean
  onToggle: () => void
  /** Next to the title (the folded Pages' current page). */
  aside?: React.ReactNode
  actions: React.ReactNode
}) {
  return (
    <div className="flex h-11 shrink-0 items-center justify-between gap-2 pr-2 pl-4">
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className="flex min-w-0 cursor-pointer items-center gap-1.5 rounded-shell-control outline-none focus-visible:ring-2 focus-visible:ring-shell-accent/60"
      >
        <Chevron direction={open ? 'down' : 'right'} />
        <span className="shrink-0 type-shell-control font-semibold text-shell-text">
          {title}
        </span>
        {aside}
      </button>
      <div className="flex shrink-0 items-center gap-0.5">{actions}</div>
    </div>
  )
}

/** The header as a filter field while filtering (R42). */
function HeaderFilter({
  section,
  value,
  onChange,
  onClose,
  label,
  count,
}: {
  section: 'pages' | 'outline'
  value: string
  onChange: (value: string) => void
  onClose: () => void
  label: string
  /** "3 pages", once there is a term and a result. */
  count: string | null
}) {
  return (
    <div
      data-section={section}
      className="flex h-11 shrink-0 items-center px-2"
    >
      <label className="flex h-7.5 min-w-0 flex-1 items-center gap-2 rounded-shell-control border border-shell-focus bg-shell-input pr-1 pl-2 text-shell-muted shadow-[0_0_0_3px_var(--color-shell-focus-ring)]">
        <ActionIcon name="search" />
        <input
          autoFocus
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={label}
          aria-label={label}
          className="min-w-0 flex-1 bg-transparent type-shell-control text-shell-text outline-none placeholder:text-shell-disabled"
        />
        {count !== null && (
          <span className="shrink-0 text-[0.6875rem] leading-3.5 text-shell-icon">
            {count}
          </span>
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label={t('shellAlpha.closeFilter', 'Close the filter')}
          className="inline-flex size-5.5 shrink-0 cursor-pointer items-center justify-center rounded-md text-shell-muted outline-none hover:bg-shell-raised hover:text-shell-text focus-visible:ring-2 focus-visible:ring-shell-accent/60"
        >
          <ActionIcon name="close" />
        </button>
      </label>
    </div>
  )
}

/** Typing while the tree has focus opens its filter with that key. */
function typeToFilter(open: (term: string) => void) {
  return (event: React.KeyboardEvent) => {
    if (event.key.length !== 1 || event.key === ' ') return
    if (event.metaKey || event.ctrlKey || event.altKey) return
    const target = event.target as HTMLElement
    if (target.closest('input, textarea, [contenteditable="true"]')) return
    event.preventDefault()
    open(event.key)
  }
}

const sectionBody = 'flex min-h-0 flex-col overflow-y-auto px-2 pb-2'

function PagesSection({
  open,
  onToggle,
  filter,
  onFilterChange,
  onClose,
  bodyStyle,
}: {
  open: boolean
  onToggle: () => void
  filter: string | null
  onFilterChange: (filter: string | null) => void
  onClose: () => void
  bodyStyle?: React.CSSProperties
}) {
  const { site, selectedDocument, selectDocument, nodesEdited } = useStudio()
  const { data: nodeTypes } = useNodeTypes()
  const [request, setRequest] = React.useState<InsertRequest | null>(null)
  const canCreate = useNodeEditable(selectedDocument, 'createNodes')
  const [debounced, setDebounced] = React.useState('')
  React.useEffect(() => {
    const timer = setTimeout(
      () => setDebounced((filter ?? '').trim()),
      FILTER_DEBOUNCE_MS,
    )
    return () => clearTimeout(timer)
  }, [filter])
  const filtering = filter !== null && debounced !== ''
  const results = usePageFilter(filtering ? debounced : '')

  const openPage = (document: Node) => {
    selectDocument(document)
    requestPanelReveal('visual-editor')
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

  const title = t('shellAlpha.pages', 'Pages')
  return (
    <>
      {filter !== null && open ? (
        <HeaderFilter
          section="pages"
          value={filter}
          onChange={onFilterChange}
          onClose={() => onFilterChange(null)}
          label={t('shellAlpha.filterPages', 'Filter pages')}
          count={
            filtering && results.rows !== null
              ? results.matches === 1
                ? t('shellAlpha.onePage', '1 page')
                : t('shellAlpha.pageCount', '{0} pages', [results.matches])
              : null
          }
        />
      ) : (
        <SectionHeader
          title={title}
          open={open}
          onToggle={onToggle}
          aside={
            !open &&
            selectedDocument && (
              <span className="flex min-w-0 items-center gap-1.25 pl-1 text-shell-muted">
                <AlphaTypeIcon
                  nodeTypes={nodeTypes}
                  nodeTypeName={selectedDocument.nodeType}
                />
                <span className="truncate type-shell-secondary">
                  {selectedDocument.label}
                </span>
              </span>
            )
          }
          actions={
            <>
              {open && (
                <>
                  <HeaderAction
                    label={t('shellAlpha.filterPages', 'Filter pages')}
                    onClick={() => onFilterChange('')}
                  >
                    <ActionIcon name="search" />
                  </HeaderAction>
                  <HeaderAction
                    label={t('shellAlpha.newPage', 'New page')}
                    disabled={!selectedDocument || !canCreate}
                    onClick={newPage}
                  >
                    <ActionIcon name="plus" />
                  </HeaderAction>
                  <HeaderDivider />
                </>
              )}
              <CloseAction onClick={onClose} />
            </>
          }
        />
      )}
      {open && (
        <div
          data-section="pages"
          className={cn(sectionBody, 'flex-1')}
          style={bodyStyle}
          onKeyDown={
            filter === null
              ? typeToFilter((key) => onFilterChange(key))
              : undefined
          }
        >
          {filtering && (
            <FilterResults
              rows={results.rows}
              term={debounced}
              look="current"
              selectedId={selectedDocument?.nodeAggregateId ?? null}
              empty={t('shellAlpha.noPages', 'No pages match')}
              onPick={openPage}
            />
          )}
          {/* Kept mounted while filtering, so closing the filter returns to
              the tree as it was left. */}
          <div className={cn('flex min-h-0 flex-col', filtering && 'hidden')}>
            <SiteDocumentTree
              onOpen={openPage}
              onCreate={setRequest}
              onCreateChild
            />
          </div>
        </div>
      )}
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

function OutlineSection({
  open,
  onToggle,
  filter,
  onFilterChange,
  collapseAll,
  onCollapseAll,
}: {
  open: boolean
  onToggle: () => void
  filter: string | null
  onFilterChange: (filter: string | null) => void
  collapseAll: number
  onCollapseAll: () => void
}) {
  const { inspectedNode, inspectNode } = useStudio()
  const term = (filter ?? '').trim()
  const results = useOutlineFilter(term)
  const filtering = filter !== null && term !== ''
  return (
    <>
      {filter !== null && open ? (
        <HeaderFilter
          section="outline"
          value={filter}
          onChange={onFilterChange}
          onClose={() => onFilterChange(null)}
          label={t('shellAlpha.filterOutline', 'Filter the outline')}
          count={
            filtering && results.rows !== null
              ? results.matches === 1
                ? t('shellAlpha.oneElement', '1 element')
                : t('shellAlpha.elementCount', '{0} elements', [
                    results.matches,
                  ])
              : null
          }
        />
      ) : (
        <SectionHeader
          title={t('panel.title.outline', 'Outline')}
          open={open}
          onToggle={onToggle}
          actions={
            open && (
              <>
                <HeaderAction
                  label={t('shellAlpha.collapseAll', 'Collapse all')}
                  onClick={onCollapseAll}
                >
                  <ActionIcon name="collapseAll" />
                </HeaderAction>
                <HeaderAction
                  label={t('shellAlpha.filterOutline', 'Filter the outline')}
                  onClick={() => onFilterChange('')}
                >
                  <ActionIcon name="search" />
                </HeaderAction>
              </>
            )
          }
        />
      )}
      {open && (
        <div
          data-section="outline"
          className={cn(sectionBody, 'flex-1')}
          onKeyDown={
            filter === null
              ? typeToFilter((key) => onFilterChange(key))
              : undefined
          }
        >
          {filtering && (
            <FilterResults
              rows={results.rows}
              term={term}
              look="selection"
              selectedId={inspectedNode?.nodeAggregateId ?? null}
              empty={t('shellAlpha.noElements', 'No elements match')}
              onPick={inspectNode}
            />
          )}
          <div className={cn('flex min-h-0 flex-col', filtering && 'hidden')}>
            <PageOutline
              collapseAll={collapseAll}
              onAdd={(node, mode) => requestAdd({ node, mode })}
            />
          </div>
        </div>
      )}
    </>
  )
}

type Rows = FilterRow<Node>[] | null

/** The site's pages whose title has the term, with their parents. */
function usePageFilter(term: string): { rows: Rows; matches: number } {
  const { site, workspaceName, dimensionSpacePoint } = useStudio()
  const access = useAccess()
  const siteNode =
    site && workspaceName && dimensionSpacePoint
      ? siteNodeAddress(site, workspaceName, dimensionSpacePoint)
      : null
  const results = useFilteredDescendants(
    siteNode,
    term,
    DOCUMENT_NODE_TYPE,
    term !== '',
  )
  const hits = React.useMemo(
    () =>
      (results.data ?? [])
        .filter(
          (node) =>
            !site ||
            nodeAccessState(
              access,
              [
                node.nodeAggregateId,
                ...(node.ancestors ?? []).map(
                  (ancestor) => ancestor.nodeAggregateId,
                ),
              ],
              site.nodeName,
            ) !== 'hidden',
        )
        .map(toHit),
    [results.data, access, site],
  )
  return useOrderedRows(hits, null, results.data === undefined)
}

/** The selected page's content whose label has the term, with parents. */
function useOutlineFilter(term: string): { rows: Rows; matches: number } {
  const { selectedDocument } = useStudio()
  const { data: nodeTypes } = useNodeTypes()
  const page = selectedDocument?.nodeAggregateId ?? null
  // Labels are not properties to search by: the page's content is read
  // once and filtered here.
  const results = useFilteredDescendants(
    selectedDocument ? nodeAddressOf(selectedDocument) : null,
    '',
    CONTENT_NODE_TYPES,
    term !== '',
  )
  const hits = React.useMemo(
    () =>
      (results.data ?? [])
        .filter(
          (node) =>
            labelMatches(node.label, term) &&
            // Content of the pages below has a page of its own nearer.
            (node.ancestors ?? []).find(
              (ancestor) =>
                nodeTypes !== undefined &&
                isOfType(nodeTypes, ancestor.nodeType, DOCUMENT_NODE_TYPE),
            )?.nodeAggregateId === page,
        )
        .map(toHit),
    [results.data, term, nodeTypes, page],
  )
  return useOrderedRows(hits, page, results.data === undefined)
}

function toHit(node: Node) {
  return {
    nodeAggregateId: node.nodeAggregateId,
    node,
    ancestors: node.ancestors ?? [],
  }
}

function useOrderedRows(
  hits: ReturnType<typeof toHit>[],
  rootId: string | null,
  pending: boolean,
): { rows: Rows; matches: number } {
  const positions = useChildPositions(hits)
  return React.useMemo(() => {
    if (pending) return { rows: null, matches: 0 }
    const ordered = treeOrder(hits, positions).map((hit) => ({
      ...hit,
      ancestors: hit.ancestors.map((ancestor) => ({
        nodeAggregateId: ancestor.nodeAggregateId,
        node: ancestor,
      })),
    }))
    return { rows: filterRows(ordered, rootId), matches: hits.length }
  }, [hits, positions, rootId, pending])
}

/** Filter results: the matches, their parents muted for context. */
function FilterResults({
  rows,
  term,
  look,
  selectedId,
  empty,
  onPick,
}: {
  rows: Rows
  term: string
  look: 'current' | 'selection'
  selectedId: string | null
  empty: string
  onPick: (node: Node) => void
}) {
  const { data: nodeTypes } = useNodeTypes()
  if (rows === null)
    return (
      <p className="px-2 py-1.5 type-shell-secondary text-shell-muted">
        {t('shellAlpha.addLoading', 'Loading…')}
      </p>
    )
  if (rows.length === 0)
    return (
      <p className="px-2 py-1.5 type-shell-secondary text-shell-muted">
        {empty}
      </p>
    )
  return (
    <div className="flex flex-col gap-0.5" role="list">
      {rows.map((row) => {
        const selected = row.nodeAggregateId === selectedId
        const muted = !row.match && !selected
        return (
          <button
            key={row.nodeAggregateId}
            type="button"
            role="listitem"
            onClick={() => onPick(row.node)}
            style={{ paddingLeft: `${0.5 + row.depth}rem` }}
            className={cn(
              'flex h-7 w-full shrink-0 items-center gap-1.5 overflow-hidden rounded-shell-control pr-2 text-left type-shell-control whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-shell-accent/60',
              selected
                ? look === 'current'
                  ? 'bg-shell-raised font-semibold text-shell-text'
                  : 'bg-shell-accent-tint font-medium text-shell-text'
                : muted
                  ? 'text-shell-subtle hover:bg-shell-ground'
                  : 'text-shell-text hover:bg-shell-ground',
            )}
          >
            <span className="flex w-2.5 shrink-0 justify-center">
              {row.parent && (
                <Chevron
                  direction="down"
                  className={muted ? 'text-shell-disabled' : undefined}
                />
              )}
            </span>
            <span
              className={cn(
                'flex w-3 shrink-0 justify-center text-[0.75rem] leading-none',
                selected
                  ? look === 'current'
                    ? 'text-shell-text'
                    : 'text-shell-accent-pale'
                  : muted
                    ? 'text-shell-disabled'
                    : 'text-shell-muted',
              )}
            >
              <AlphaTypeIcon
                nodeTypes={nodeTypes}
                nodeTypeName={row.node.nodeType}
                hidden={row.node.isHidden}
              />
            </span>
            <span className="min-w-0 flex-1 truncate">
              {row.match
                ? highlightParts(row.node.label, term).map((part, index) =>
                    part.match ? (
                      <span
                        key={index}
                        className="font-semibold text-shell-accent-pale"
                      >
                        {part.text}
                      </span>
                    ) : (
                      part.text
                    ),
                  )
                : row.node.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
