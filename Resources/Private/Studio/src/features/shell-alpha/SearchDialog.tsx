import * as React from 'react'
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { dimensionSpacePointLabel } from '@/api/neos/endpoints/contentRepositories'
import { siteNodeAddress } from '@/api/neos/endpoints/sites'
import { useNodeTypes } from '@/api/neos/endpoints/nodeTypes'
import { useWorkspaceChanges } from '@/api/neos/endpoints/workspaces'
import {
  type Asset,
  type AssetType,
  nodeAddressOf,
  sameDimensionSpacePoint,
} from '@/api/neos/schema'
import { useStudio } from '@/app/StudioContext'
import type { EditingContext } from '@/app/useEditingContext'
import type { RevealLocation } from '@/app/useSelection'
import { AssetThumb } from '@/features/media/AssetThumb'
import { requestAssetOpen } from '@/features/media/openAsset'
import { useKeyboardShortcut } from '@/features/shortcuts/useKeyboardShortcut'
import { NodeTypeIcon } from '@/features/tree/nodeTypeIcon'
import { workspaceLabel } from '@/features/workspaces/changeDisplay'
import { useWorkspaceDocumentChanges } from '@/features/workspaces/historyData'
import { translate as t, translatePlural as tp } from '@/lib/i18n'
import { containedPortal } from '@/lib/portalContainer'
import { cn } from '@/lib/utils'
import { CheckIcon, ChevronDownIcon, CloseIcon, SearchIcon } from './icons'
import { ShellMenu, ShellMenuItem, ShellMenuSeparator } from './primitives'
import {
  documentPath,
  highlightParts,
  propertySnippet,
  rememberSearch,
} from './searchText'
import {
  type HitGroup,
  MIN_TERM_LENGTH,
  type NodeHit,
  type SearchScope,
  useOtherLanguageCounts,
  useSiteSearch,
} from './useSiteSearch'

const DialogPortal = containedPortal(DialogPrimitive.Portal)

const RECENT_KEY = 'neos-studio.alpha.recentSearches'
const DEBOUNCE_MS = 200
/** Rows per group until "Show all". */
const GROUP_PREVIEW = 4
const RECENT_SEARCHES = 3
const RECENT_PAGES = 3

/**
 * A row of the list. Groups and rows are generic, so further groups - the
 * command bar's actions - join the list and its keyboard navigation as they
 * are.
 */
interface SearchRow {
  key: string
  /** 32px tile (results) or 12px glyph (compact rows). */
  icon: React.ReactNode
  title: React.ReactNode
  detail?: React.ReactNode
  /** A trailing state tag ("Changed"). */
  tag?: React.ReactNode
  /** Hidden content: quieter text. */
  quiet?: boolean
  onPick: () => void
}

interface SearchGroup {
  id: string
  label: string
  rows: SearchRow[]
  compact?: boolean
  /** "Show all n …" under the rows. */
  more?: { label: string; onShow: () => void }
}

/**
 * Search (R35): a dialog over the whole Studio, opened from the action bar
 * or with mod+K. Stays mounted while closed, so reopening keeps the last
 * query and its results.
 */
export function SearchDialog({
  open,
  onOpenChange,
  editing,
  onReveal,
  onOpenMode,
  onChangeDimension,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing: EditingContext
  onReveal: (location: RevealLocation) => void
  onOpenMode: (mode: string) => void
  onChangeDimension: (point: string) => void
}) {
  const { site, selectedDocument, workspaceName } = useStudio()
  const { data: nodeTypes } = useNodeTypes()
  const [query, setQuery] = React.useState('')
  const term = useDebounced(query.trim(), DEBOUNCE_MS)
  const [scope, setScope] = React.useState<SearchScope>('site')
  const [type, setType] = React.useState<string | null>(null)
  const [expanded, setExpanded] = React.useState<string | null>(null)
  const [active, setActive] = React.useState(0)
  const [recent, setRecent] = useRecentSearches()
  const inputRef = React.useRef<HTMLInputElement>(null)
  const listRef = React.useRef<HTMLDivElement>(null)

  useKeyboardShortcut({
    id: 'shellAlpha.search',
    // The command-bar key every editor knows, rather than the accessor.
    combo: 'mod+k',
    allowInInput: true,
    title: t('shellAlpha.searchSite', 'Search the site'),
    category: t('shortcuts.category.general', 'General'),
    handler: () => onOpenChange(!open),
  })

  const { dimensionSpacePoint, dimensions } = editing
  const siteAddress =
    site && workspaceName && dimensionSpacePoint
      ? siteNodeAddress(site, workspaceName, dimensionSpacePoint)
      : null
  const effectiveScope = scope === 'page' && !selectedDocument ? 'site' : scope
  const search = useSiteSearch({
    term,
    scope: effectiveScope,
    site: siteAddress,
    page: selectedDocument ? nodeAddressOf(selectedDocument) : null,
  })

  const { data: changesResponse } = useWorkspaceChanges(workspaceName)
  const changed = React.useMemo(
    () =>
      new Set(
        (changesResponse?.changes ?? []).map(
          (change) => change.nodeAggregateId,
        ),
      ),
    [changesResponse],
  )

  // A new term, scope or filter starts at the top, with groups collapsed.
  const resetKey = JSON.stringify([term, effectiveScope, type])
  const [lastReset, setLastReset] = React.useState(resetKey)
  if (lastReset !== resetKey) {
    setLastReset(resetKey)
    setActive(0)
    setExpanded(null)
  }

  const close = () => onOpenChange(false)
  const remember = () => setRecent(rememberSearch(recent, term))
  const revealNode = (hit: NodeHit) => {
    remember()
    close()
    onOpenMode('visual-editor')
    if (hit.document === null) return
    const isPage = hit.document.nodeAggregateId === hit.node.nodeAggregateId
    onReveal({
      document: nodeAddressOf(hit.document),
      node: isPage ? null : nodeAddressOf(hit.node),
      fallback: null,
      highlight: isPage ? undefined : term,
    })
  }
  const openAsset = (asset: Asset) => {
    remember()
    close()
    onOpenMode('media-library')
    requestAssetOpen(asset)
  }

  const typeLabel = (name: string) => nodeTypes?.get(name)?.label || name
  const assetTypeLabel = (assetType: AssetType) =>
    ASSET_TYPE_LABELS[assetType]()

  // The types found, for the type filter: node types and asset types.
  const foundTypes = React.useMemo(() => {
    const counts = new Map<string, { label: string; count: number }>()
    const add = (key: string, label: string) => {
      const entry = counts.get(key) ?? { label, count: 0 }
      entry.count++
      counts.set(key, entry)
    }
    for (const hit of [
      ...(search.pages?.hits ?? []),
      ...(search.content?.hits ?? []),
    ])
      add(hit.node.nodeType, typeLabel(hit.node.nodeType))
    for (const asset of search.media?.hits ?? [])
      add(
        `${ASSET_TYPE_PREFIX}${asset.assetType}`,
        t('shellAlpha.search.mediaType', '{0} (media)', [
          assetTypeLabel(asset.assetType),
        ]),
      )
    // Element types first, then media types.
    return [...counts].sort(
      ([keyA, a], [keyB, b]) =>
        Number(keyA.startsWith(ASSET_TYPE_PREFIX)) -
          Number(keyB.startsWith(ASSET_TYPE_PREFIX)) ||
        a.label.localeCompare(b.label),
    )
    // typeLabel reads nodeTypes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.pages, search.content, search.media, nodeTypes])
  const typeFilter =
    type !== null && foundTypes.some(([key]) => key === type) ? type : null
  const byType = <T,>(
    group: HitGroup<T> | null,
    key: (hit: T) => string,
  ): HitGroup<T> | null => {
    if (!group || typeFilter === null) return group
    const hits = group.hits.filter((hit) => key(hit) === typeFilter)
    return { hits, total: hits.length }
  }
  const pages = byType(search.pages, (hit) => hit.node.nodeType)
  const content = byType(search.content, (hit) => hit.node.nodeType)
  const media = byType(
    search.media,
    (asset) => `${ASSET_TYPE_PREFIX}${asset.assetType}`,
  )
  const total =
    (pages?.total ?? 0) + (content?.total ?? 0) + (media?.total ?? 0)

  const nodeRow = (hit: NodeHit, isPage: boolean): SearchRow => {
    const { node } = hit
    const hidden = node.isHidden || node.isHiddenByAncestor
    const title =
      (isPage
        ? propertySnippet(node.properties, term, ['title'])
        : propertySnippet(node.properties, term)) ?? node.label
    // Pages: where they sit from the site down; content: its page down.
    const above = isPage
      ? hit.ancestors
      : hit.ancestors.slice(
          0,
          hit.document ? hit.ancestors.indexOf(hit.document) + 1 : undefined,
        )
    const location = above
      .map((ancestor) => ancestor.label)
      .reverse()
      .join(' › ')
    const path = isPage
      ? documentPath([...hit.ancestors.slice(0, -1).reverse(), node])
      : null
    const detail = [
      typeLabel(node.nodeType),
      location,
      path,
      hidden ? t('shellAlpha.search.hidden', 'hidden') : null,
    ]
      .filter(Boolean)
      .join(' · ')
    return {
      key: node.nodeAggregateId,
      icon: (
        <NodeTypeIcon
          nodeTypes={nodeTypes}
          nodeTypeName={node.nodeType}
          className="type-icon-s"
        />
      ),
      title: <Highlighted text={title} term={term} />,
      detail,
      quiet: hidden,
      tag: changed.has(node.nodeAggregateId) ? <ChangedTag /> : undefined,
      onPick: () => revealNode(hit),
    }
  }

  const groupMore = (
    id: string,
    group: HitGroup<unknown>,
    label: string,
  ): SearchGroup['more'] =>
    expanded !== id && group.total > GROUP_PREVIEW
      ? { label, onShow: () => setExpanded(id) }
      : undefined
  const cap = <T,>(id: string, hits: T[]) =>
    expanded === id ? hits : hits.slice(0, GROUP_PREVIEW)

  const searching = term.length >= MIN_TERM_LENGTH
  const { data: edited } = useWorkspaceDocumentChanges(
    workspaceName,
    site?.nodeAggregateId ?? null,
    open && !searching,
  )
  const editedPages = (edited?.documents ?? []).filter(
    (page) => !page.deleted && page.documentAddress !== null,
  )
  const groups: SearchGroup[] = []
  if (!searching) {
    groups.push(...recentGroups())
  } else {
    if (pages && pages.hits.length > 0)
      groups.push({
        id: 'pages',
        label: t('shellAlpha.search.pages', 'Pages'),
        rows: cap('pages', pages.hits).map((hit) => nodeRow(hit, true)),
        more: groupMore(
          'pages',
          pages,
          tp('shellAlpha.search.showAllPages', pages.total, [
            'Show {0} page result',
            'Show all {0} page results',
          ]),
        ),
      })
    if (content && content.hits.length > 0)
      groups.push({
        id: 'content',
        label: t('shellAlpha.search.content', 'Content'),
        rows: cap('content', content.hits).map((hit) => nodeRow(hit, false)),
        more: groupMore(
          'content',
          content,
          tp('shellAlpha.search.showAllContent', content.total, [
            'Show {0} content result',
            'Show all {0} content results',
          ]),
        ),
      })
    if (media && media.hits.length > 0)
      groups.push({
        id: 'media',
        label: t('shellAlpha.search.media', 'Media'),
        rows: cap('media', media.hits).map((asset) => ({
          key: `${asset.assetSourceId}:${asset.id}`,
          icon: (
            <AssetThumb
              asset={asset}
              className="size-8 rounded-shell-control object-cover"
            />
          ),
          title: (
            <Highlighted text={asset.filename || asset.label} term={term} />
          ),
          detail: [
            assetTypeLabel(asset.assetType),
            asset.width && asset.height
              ? `${asset.width} × ${asset.height}`
              : null,
            asset.title && asset.title !== asset.filename ? asset.title : null,
          ]
            .filter(Boolean)
            .join(' · '),
          onPick: () => openAsset(asset),
        })),
        more: groupMore(
          'media',
          media,
          tp('shellAlpha.search.showAllMedia', media.total, [
            'Show {0} media result',
            'Show all {0} media results',
          ]),
        ),
      })
  }
  const rows = groups.flatMap((group) => group.rows)
  const activeIndex = Math.min(active, Math.max(0, rows.length - 1))
  const activeRow = rows[activeIndex]

  React.useEffect(() => {
    if (!activeRow) return
    listRef.current
      ?.querySelector(`[data-row="${CSS.escape(activeRow.key)}"]`)
      ?.scrollIntoView({ block: 'nearest' })
  }, [activeRow])

  const nothingFound =
    searching &&
    !search.pending &&
    groups.length === 0 &&
    (search.pages !== null || search.content !== null || search.media !== null)

  const otherPoints = editing.allowedEditablePoints.filter(
    (point) =>
      dimensionSpacePoint === null ||
      !sameDimensionSpacePoint(point, dimensionSpacePoint),
  )
  const elsewhere = useOtherLanguageCounts(
    siteAddress,
    term,
    otherPoints,
    open && nothingFound && effectiveScope !== 'media' && typeFilter === null,
  )

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (rows.length === 0) return
      const step = event.key === 'ArrowDown' ? 1 : -1
      setActive((activeIndex + step + rows.length) % rows.length)
    } else if (event.key === 'Enter' && activeRow) {
      event.preventDefault()
      activeRow.onPick()
    }
  }

  const languageLabel = dimensionSpacePoint
    ? dimensionSpacePointLabel(dimensionSpacePoint, dimensions)
    : ''
  const activeWorkspace = editing.activeWorkspace
  const workspace =
    activeWorkspace && activeWorkspace.name === editing.personalWorkspace?.name
      ? t('workspace.myWorkspace', 'My workspace')
      : workspaceLabel(activeWorkspace ?? undefined, workspaceName ?? '')

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-200 bg-shell-scrim transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <DialogPrimitive.Popup
          initialFocus={inputRef}
          aria-label={t('shellAlpha.search', 'Search')}
          onKeyDown={onKeyDown}
          className="fixed top-24 left-1/2 z-200 flex max-h-[calc(100svh-8rem)] w-160 max-w-[calc(100vw-2rem)] -translate-x-1/2 flex-col overflow-hidden rounded-shell-surface border border-shell-border-strong bg-shell-surface text-shell-text shadow-shell-dialog outline-none transition-[opacity,scale] duration-150 data-ending-style:scale-[0.98] data-ending-style:opacity-0 data-starting-style:scale-[0.98] data-starting-style:opacity-0"
        >
          <div className="flex h-14 shrink-0 items-center gap-3 border-b border-shell-tooltip-border px-4.5">
            <SearchIcon
              width={16}
              height={16}
              strokeWidth={1.3}
              className="text-shell-glyph"
            />
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t(
                'shellAlpha.search.placeholder',
                'Search pages, content and media',
              )}
              role="combobox"
              aria-expanded
              aria-controls="shell-alpha-search-results"
              aria-activedescendant={
                activeRow ? rowId(activeRow.key) : undefined
              }
              aria-autocomplete="list"
              className="min-w-0 flex-1 bg-transparent text-base leading-5.5 text-shell-text caret-shell-accent outline-none placeholder:text-shell-disabled"
            />
            <DialogPrimitive.Close
              aria-label={t('common.close', 'Close')}
              className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-shell-control text-shell-muted outline-none hover:bg-shell-hover hover:text-shell-text focus-visible:ring-2 focus-visible:ring-shell-accent/60"
            >
              <CloseIcon />
            </DialogPrimitive.Close>
          </div>
          <div className="flex shrink-0 items-center gap-2 px-3.5 py-2.5">
            <ScopeControl
              value={effectiveScope}
              pageAvailable={selectedDocument !== null}
              onChange={(next) => {
                setScope(next)
                inputRef.current?.focus()
              }}
            />
            <TypeFilter
              types={foundTypes}
              value={typeFilter}
              onChange={setType}
            />
            <div className="flex-1" />
            {searching && !nothingFound && (
              <span className="type-shell-secondary text-shell-icon">
                {tp('shellAlpha.search.resultCount', total, [
                  '{0} result',
                  '{0} results',
                ])}
              </span>
            )}
          </div>
          <div
            ref={listRef}
            id="shell-alpha-search-results"
            role="listbox"
            aria-label={t('shellAlpha.search.results', 'Results')}
            className="flex min-h-0 flex-col gap-0.5 overflow-y-auto px-2 pb-2"
          >
            {groups.map((group, index) => (
              <div
                key={group.id}
                role="group"
                aria-labelledby={`shell-alpha-search-${group.id}`}
                className="flex flex-col gap-0.5"
              >
                <div
                  id={`shell-alpha-search-${group.id}`}
                  className={cn(
                    'px-2.5 pb-1 text-[0.6875rem] leading-3.5 font-semibold tracking-[0.04em] text-shell-icon uppercase',
                    index === 0 ? 'pt-2' : 'pt-2.5',
                  )}
                >
                  {group.label}
                </div>
                {group.rows.map((row) => {
                  const rowIndex = rows.indexOf(row)
                  return (
                    <ResultRow
                      key={row.key}
                      row={row}
                      compact={group.compact}
                      active={rowIndex === activeIndex}
                      onHover={() => setActive(rowIndex)}
                    />
                  )
                })}
                {group.more && (
                  <button
                    type="button"
                    onClick={group.more.onShow}
                    className="cursor-pointer self-start rounded-shell-control px-2.5 pt-2 pb-0.5 text-left type-shell-secondary text-shell-muted outline-none hover:text-shell-text focus-visible:ring-2 focus-visible:ring-shell-accent/60"
                  >
                    {group.more.label}
                  </button>
                )}
              </div>
            ))}
            {searching && groups.length === 0 && search.pending && (
              <p className="px-2.5 pt-2 pb-3 type-shell-secondary text-shell-muted">
                {t('shellAlpha.search.searching', 'Searching…')}
              </p>
            )}
            {nothingFound && (
              <NothingFound
                scope={effectiveScope}
                language={languageLabel}
                elsewhere={elsewhere.map(({ point, count }) => ({
                  point,
                  count,
                  label: dimensionSpacePointLabel(point, dimensions),
                }))}
                onSearchIn={onChangeDimension}
              />
            )}
          </div>
          <div className="flex h-10 shrink-0 items-center border-t border-shell-tooltip-border px-4.5">
            <span className="truncate type-shell-secondary text-shell-icon">
              {languageLabel
                ? t(
                    'shellAlpha.search.footer',
                    'Searching {0} · {1}, unpublished changes included',
                    [workspace, languageLabel],
                  )
                : t(
                    'shellAlpha.search.footerNoLanguage',
                    'Searching {0}, unpublished changes included',
                    [workspace],
                  )}
            </span>
          </div>
        </DialogPrimitive.Popup>
      </DialogPortal>
    </DialogPrimitive.Root>
  )

  /** Just opened: recent searches, then the pages with your changes. */
  function recentGroups(): SearchGroup[] {
    return [
      {
        id: 'recent',
        label: t('shellAlpha.search.recent', 'Recent'),
        compact: true,
        rows: [
          ...recent.slice(0, RECENT_SEARCHES).map((entry): SearchRow => ({
            key: `search:${entry}`,
            icon: <ClockIcon />,
            title: entry,
            onPick: () => {
              setQuery(entry)
              inputRef.current?.focus()
            },
          })),
          ...editedPages.slice(0, RECENT_PAGES).flatMap((page): SearchRow[] =>
            page.documentAddress
              ? [
                  {
                    key: `page:${page.documentAggregateId}`,
                    icon: <PageGlyph />,
                    title: page.breadcrumb.slice(1).join(' › ') || page.label,
                    detail: t(
                      'shellAlpha.search.pageYouEdited',
                      'page you edited',
                    ),
                    onPick: () => {
                      close()
                      onOpenMode('visual-editor')
                      onReveal({
                        document: page.documentAddress!,
                        node: null,
                        fallback: null,
                      })
                    },
                  },
                ]
              : [],
          ),
        ],
      },
    ].filter((group) => group.rows.length > 0)
  }
}

/** Media types in the type filter, apart from node type names. */
const ASSET_TYPE_PREFIX = 'asset:'

const ASSET_TYPE_LABELS: Record<AssetType, () => string> = {
  image: () => t('shellAlpha.search.assetType.image', 'Image'),
  document: () => t('shellAlpha.search.assetType.document', 'Document'),
  video: () => t('shellAlpha.search.assetType.video', 'Video'),
  audio: () => t('shellAlpha.search.assetType.audio', 'Audio'),
}

const rowId = (key: string) => `shell-alpha-search-row-${key}`

function ResultRow({
  row,
  compact,
  active,
  onHover,
}: {
  row: SearchRow
  compact?: boolean
  active: boolean
  onHover: () => void
}) {
  const shared = {
    id: rowId(row.key),
    role: 'option',
    'aria-selected': active,
    'data-row': row.key,
    onMouseMove: active ? undefined : onHover,
    // The input keeps the focus; a click picks without taking it.
    onMouseDown: (event: React.MouseEvent) => event.preventDefault(),
    onClick: row.onPick,
  } as const
  if (compact)
    return (
      <div
        {...shared}
        className={cn(
          'flex h-8 shrink-0 cursor-pointer items-center gap-2.5 rounded-shell-control px-2.5 text-shell-subtle',
          active && 'bg-shell-raised',
        )}
      >
        {row.icon}
        <span className="min-w-0 truncate type-shell-control text-shell-glyph">
          {row.title}
        </span>
        {row.detail && (
          <span className="shrink-0 type-shell-secondary text-shell-icon">
            {row.detail}
          </span>
        )}
      </div>
    )
  return (
    <div
      {...shared}
      className={cn(
        'flex shrink-0 cursor-pointer items-center gap-3 rounded-shell-control px-2.5 py-2',
        active && 'bg-shell-raised',
      )}
    >
      <span
        className={cn(
          'flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-shell-control',
          active
            ? 'bg-shell-active text-shell-text'
            : 'bg-shell-ground text-shell-glyph',
          row.quiet && 'text-shell-icon',
        )}
      >
        {row.icon}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span
          className={cn(
            'truncate text-[0.8125rem] leading-4.5',
            row.quiet ? 'text-shell-muted' : 'text-shell-text',
          )}
        >
          {row.title}
        </span>
        {row.detail && (
          <span
            className={cn(
              'truncate type-shell-secondary',
              row.quiet
                ? 'text-shell-icon'
                : active
                  ? 'text-shell-muted'
                  : 'text-shell-subtle',
            )}
          >
            {row.detail}
          </span>
        )}
      </span>
      {row.tag}
    </div>
  )
}

function Highlighted({ text, term }: { text: string; term: string }) {
  return (
    <>
      {highlightParts(text, term).map((part, index) =>
        part.match ? (
          <span key={index} className="font-semibold text-shell-accent-pale">
            {part.text}
          </span>
        ) : (
          part.text
        ),
      )}
    </>
  )
}

/** Unpublished changes in the workspace searched. */
function ChangedTag() {
  return (
    <span className="flex h-5 shrink-0 items-center rounded-[0.625rem] bg-shell-changed-tint px-1.75 text-[0.6875rem] leading-3.5 text-shell-changed-text">
      {t('shellAlpha.search.changed', 'Changed')}
    </span>
  )
}

const SCOPES: Array<{ value: SearchScope; label: () => string }> = [
  {
    value: 'site',
    label: () => t('shellAlpha.search.scopeSite', 'Whole site'),
  },
  { value: 'page', label: () => t('shellAlpha.search.scopePage', 'This page') },
  { value: 'media', label: () => t('shellAlpha.search.scopeMedia', 'Media') },
]

function ScopeControl({
  value,
  pageAvailable,
  onChange,
}: {
  value: SearchScope
  pageAvailable: boolean
  onChange: (scope: SearchScope) => void
}) {
  return (
    <div
      role="radiogroup"
      aria-label={t('shellAlpha.search.scope', 'Search in')}
      className="flex shrink-0 rounded-shell-control bg-shell-input p-0.5"
    >
      {SCOPES.map((scope) => {
        const checked = scope.value === value
        return (
          <button
            key={scope.value}
            type="button"
            role="radio"
            aria-checked={checked}
            disabled={scope.value === 'page' && !pageAvailable}
            onClick={() => onChange(scope.value)}
            className={cn(
              'flex h-6.5 cursor-pointer items-center rounded-md px-2.5 type-shell-secondary outline-none focus-visible:ring-2 focus-visible:ring-shell-accent/60 disabled:cursor-default disabled:text-shell-faint',
              checked
                ? 'bg-shell-raised font-semibold text-shell-text'
                : 'text-shell-muted hover:text-shell-text',
            )}
          >
            {scope.label()}
          </button>
        )
      })}
    </div>
  )
}

function TypeFilter({
  types,
  value,
  onChange,
}: {
  types: Array<[string, { label: string; count: number }]>
  value: string | null
  onChange: (type: string | null) => void
}) {
  const current = types.find(([key]) => key === value)?.[1].label
  return (
    <ShellMenu
      trigger={
        <button
          type="button"
          className={cn(
            'flex h-7.5 shrink-0 cursor-pointer items-center gap-1.5 rounded-shell-control border border-dashed border-shell-dashed px-2.5 type-shell-secondary outline-none hover:border-shell-muted/40 focus-visible:ring-2 focus-visible:ring-shell-accent/60 data-popup-open:bg-shell-hover',
            current ? 'text-shell-text' : 'text-shell-muted',
          )}
        >
          {current ?? t('shellAlpha.search.allTypes', 'All types')}
          <ChevronDownIcon className="text-shell-muted" />
        </button>
      }
      className="max-h-80 min-w-48 overflow-y-auto"
    >
      <ShellMenuItem
        icon={value === null ? <CheckIcon /> : null}
        onClick={() => onChange(null)}
      >
        {t('shellAlpha.search.allTypes', 'All types')}
      </ShellMenuItem>
      {types.map(([key, { label, count }], index) => (
        <React.Fragment key={key}>
          {(index === 0 ||
            key.startsWith(ASSET_TYPE_PREFIX) !==
              types[index - 1]![0].startsWith(ASSET_TYPE_PREFIX)) && (
            <ShellMenuSeparator />
          )}
          <ShellMenuItem
            icon={value === key ? <CheckIcon /> : null}
            trailing={count}
            onClick={() => onChange(key)}
          >
            {label}
          </ShellMenuItem>
        </React.Fragment>
      ))}
    </ShellMenu>
  )
}

/**
 * Nothing in this language: says so, and where else the term is - with a
 * button to switch there; the query stays.
 */
function NothingFound({
  scope,
  language,
  elsewhere,
  onSearchIn,
}: {
  scope: SearchScope
  language: string
  elsewhere: Array<{ point: string; count: number; label: string }>
  onSearchIn: (point: string) => void
}) {
  const headline =
    scope === 'media'
      ? t('shellAlpha.search.noMedia', 'No media found')
      : scope === 'page'
        ? language
          ? t(
              'shellAlpha.search.nothingOnPage',
              'No results on this page in {0}',
              [language],
            )
          : t(
              'shellAlpha.search.nothingOnPageNoLanguage',
              'No results on this page',
            )
        : language
          ? t(
              'shellAlpha.search.nothingOnSite',
              'No results on this site in {0}',
              [language],
            )
          : t(
              'shellAlpha.search.nothingOnSiteNoLanguage',
              'No results on this site',
            )
  return (
    <div className="flex flex-col gap-1.5 px-4 py-5">
      <p className="type-shell-control font-semibold text-shell-text">
        {headline}
      </p>
      {elsewhere.length > 0 && (
        <>
          <p className="text-[0.8125rem] leading-4.5 text-shell-muted">
            {elsewhere
              .map(({ count, label }) =>
                tp(
                  'shellAlpha.search.foundIn',
                  count,
                  ['Found once in {1}.', 'Found {0} times in {1}.'],
                  [label],
                ),
              )
              .join(' ')}
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            {elsewhere.map(({ point, label }) => (
              <button
                key={point}
                type="button"
                onClick={() => onSearchIn(point)}
                className="flex h-7.5 cursor-pointer items-center rounded-shell-control bg-shell-raised px-3 type-shell-secondary text-shell-text outline-none hover:bg-shell-active focus-visible:ring-2 focus-visible:ring-shell-accent/60"
              >
                {t('shellAlpha.search.searchIn', 'Search in {0}', [label])}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

const ClockIcon = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 12 12"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.2"
    aria-hidden
    className="shrink-0"
  >
    <circle cx="6" cy="6" r="5" />
    <path d="M6 3.5V6l1.8 1.2" strokeLinecap="round" />
  </svg>
)

const PageGlyph = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 11 12"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.2"
    strokeLinejoin="round"
    aria-hidden
    className="shrink-0"
  >
    <path d="M1.5 1h5l3 3v7h-8z" />
  </svg>
)

function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = React.useState(value)
  React.useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay)
    return () => window.clearTimeout(timer)
  }, [value, delay])
  return debounced
}

function useRecentSearches(): [string[], (recent: string[]) => void] {
  const [recent, setRecent] = React.useState<string[]>(() => {
    try {
      const stored: unknown = JSON.parse(
        localStorage.getItem(RECENT_KEY) ?? '[]',
      )
      return Array.isArray(stored)
        ? stored.filter((entry): entry is string => typeof entry === 'string')
        : []
    } catch {
      return []
    }
  })
  return [
    recent,
    (next) => {
      setRecent(next)
      localStorage.setItem(RECENT_KEY, JSON.stringify(next))
    },
  ]
}
