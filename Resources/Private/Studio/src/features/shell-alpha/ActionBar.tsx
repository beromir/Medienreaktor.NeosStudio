import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { useActiveContentRepositoryId } from '@/api/neos/activeContentRepository'
import {
  DOCUMENT_NODE_TYPE,
  fetchChildren,
  fetchNode,
  useNodeAncestors,
} from '@/api/neos/endpoints/nodes'
import {
  isOfType,
  useNodeType,
  useNodeTypes,
} from '@/api/neos/endpoints/nodeTypes'
import { neosKeys } from '@/api/neos/keys'
import { type Node, nodeAddressOf, type NodeAddress } from '@/api/neos/schema'
import { useStudio } from '@/app/StudioContext'
import { toast } from '@/components/ui/toast'
import { CreateNodeFlow } from '@/features/creation/NodeCreationDialog'
import {
  InsertNodeDialog,
  type InsertMode,
  type InsertRequest,
  useInsertion,
} from '@/features/creation/InsertNodeDialog'
import type { CreatableNodeTypeGroup } from '@/features/creation/creatableNodeTypes'
import { redo, undo, useHistory } from '@/features/history/historyStore'
import type { HistoryLocation } from '@/features/history/location'
import { hasContentSettings } from '@/features/inspector/Inspector'
import {
  onPreviewCreateRequest,
  onPreviewEscape,
  onPreviewPointerNearBottom,
  type PreviewCreateRequest,
  onPreviewScroll,
  setPreviewChrome,
  usePreviewChrome,
} from '@/features/preview/chromeStore'
import { useKeyboardShortcut } from '@/features/shortcuts/useKeyboardShortcut'
import { NodeTypeIcon } from '@/features/tree/nodeTypeIcon'
import { translate as t } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { useLatestRef } from '@/hooks/use-latest-ref'
import {
  BackIcon,
  ChevronDownIcon,
  EyeOffIcon,
  PageIcon,
  PlusIcon,
  RedoIcon,
  SearchIcon,
  SettingsIcon,
  UndoIcon,
  UploadIcon,
} from './icons'
import {
  AddButton,
  BarPill,
  IconButton,
  LabelButton,
  Surface,
} from './primitives'
import { anchorProps, NativePopover, type Placement } from './NativePopover'
import { Tooltip, useTooltip } from './Tooltip'
import { PathMenu } from './PathMenu'
import { ElementMenu } from './ElementMenu'
import { type AddRequest, onAddRequest } from './addRequest'

type Open = 'add' | null

/** The bar's height plus its distance from the card's bottom edge. */
const BAR_SPACE = 64
/** How long the bar stays faded after the page stopped scrolling. */
const FADE_SETTLE_MS = 450
const ADD_ID = 'shell-alpha-add-menu'
const POPOVER_IDS = [ADD_ID]
const BARS_ANCHOR = '--shell-alpha-bars'
const NODE_PILL_ANCHOR = '--shell-alpha-node-pill'
/** As drawn: 8px above the bars, its left edge 235px left of their centre. */
const ADD_PLACEMENT: Placement = {
  side: 'top',
  align: 'center',
  offset: 8,
  shift: -235,
}

/**
 * The floating action bar (R9 variant D): a global pill - Add, Search,
 * Undo/Redo - and, while a content element is selected, a node pill with
 * its type, Settings (the Properties panel) and more. Add opens its
 * surface above the bar, Search the search dialog. It centres in the part
 * of the preview no floating panel covers.
 */
export function ActionBar({
  searchOpen,
  onSearch,
  onOpenMode,
  onHistoryApplied,
  onReveal,
  insets,
  propertiesOpen,
  onToggleProperties,
  onEscape,
}: {
  searchOpen: boolean
  onSearch: () => void
  /** px the floating panels cover on either side of the preview. */
  insets: { left: number; right: number }
  propertiesOpen: boolean
  onToggleProperties: () => void
  /** Esc with nothing of the bar's open; false when it did nothing either. */
  onEscape: () => boolean
  onOpenMode: (panel: string) => void
  onHistoryApplied: () => void
  onReveal: (location: HistoryLocation) => void
}) {
  const { inspectedNode, selectedDocument } = useStudio()
  const { data: nodeTypes } = useNodeTypes()
  const [open, setOpen] = React.useState<Open>(null)
  const isContent =
    inspectedNode !== null &&
    nodeTypes !== undefined &&
    !isOfType(nodeTypes, inspectedNode.nodeType, DOCUMENT_NODE_TYPE)
  const node = isContent ? inspectedNode : null
  const nodeKey = node?.nodeAggregateId ?? null
  // The full node type - the listing carries no inspector configuration.
  const { data: nodeType } = useNodeType(node?.nodeType ?? null)
  // A content element with nothing to set (an untouched content collection)
  // gets no Settings button; null while its type loads.
  const hasSettings = React.useMemo(
    () =>
      node && nodeType?.name === node.nodeType
        ? hasContentSettings(nodeType)
        : null,
    [node, nodeType],
  )
  const escape = () => {
    if (open !== null) {
      setOpen(null)
      return true
    }
    return onEscape()
  }
  const escapeRef = useLatestRef(escape)
  React.useEffect(() => onPreviewEscape(() => escapeRef.current()), [escapeRef])

  // A type dragged from the Add menu was dropped into the page.
  const { nodesEdited, inspectNode } = useStudio()
  const [dropped, setDropped] = React.useState<PreviewCreateRequest | null>(
    null,
  )
  React.useEffect(
    () =>
      onPreviewCreateRequest((request) => {
        // The menu closes, and with it the drag source - before its dragend.
        setPreviewChrome({ typeDrag: null })
        setOpen(null)
        setDropped(request)
      }),
    [],
  )
  // An Outline row's +: the Add menu at that row instead of the selection.
  const [addAt, setAddAt] = React.useState<AddRequest | null>(null)
  React.useEffect(
    () =>
      onAddRequest((request) => {
        setAddAt(request)
        setOpen('add')
      }),
    [],
  )
  if (open !== 'add' && addAt !== null) setAddAt(null)

  useKeyboardShortcut({
    id: 'shellAlpha.closeSurface',
    combo: 'escape',
    title: t('shellAlpha.escape', 'Close the menu, deselect, close panels'),
    category: t('shortcuts.category.editing', 'Editing'),
    handler: () => escape(),
  })

  const faded = useFade(open !== null, nodeKey)

  // What the bar and its open surface cover, for the page's scroll space
  // and for keeping the selection in view above them.
  // The Add menu is a native popover in the top layer, outside
  // the stack - measured by their position, not the stack's height.
  const stackRef = React.useRef<HTMLDivElement>(null)
  React.useLayoutEffect(() => {
    const stack = stackRef.current
    const card = stack?.parentElement
    if (!stack || !card) return
    const popovers = POPOVER_IDS.flatMap(
      (id) => document.getElementById(id) ?? [],
    )
    const update = () => {
      let top = stack.getBoundingClientRect().top
      for (const popover of popovers) {
        if (popover.matches(':popover-open'))
          top = Math.min(top, popover.getBoundingClientRect().top)
      }
      setPreviewChrome({
        bottomInset: Math.max(0, card.getBoundingClientRect().bottom - top),
      })
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(stack)
    popovers.forEach((popover) => observer.observe(popover))
    return () => observer.disconnect()
  }, [open])
  React.useEffect(() => {
    setPreviewChrome({ minimal: true, scrollSpace: BAR_SPACE })
  }, [])

  // The browser opened or light-dismissed one of the popovers.
  const popoverChanged = (which: 'add', value: boolean) =>
    setOpen((current) => (value ? which : current === which ? null : current))

  return (
    <div
      ref={stackRef}
      className={cn(
        'pointer-events-none absolute bottom-4 z-10 flex flex-col items-center gap-2 px-4 transition-[opacity,translate,left,right] duration-200',
        faded && 'translate-y-2 opacity-0',
      )}
      style={{ left: insets.left, right: insets.right }}
    >
      <div className="pointer-events-auto flex max-w-full flex-col items-center gap-2 *:max-w-full">
        <div className="flex items-center gap-2" {...anchorProps(BARS_ANCHOR)}>
          <BarPill>
            <Tooltip label={t('shellAlpha.add', 'Add')}>
              <AddButton
                aria-label={t('shellAlpha.add', 'Add')}
                aria-expanded={open === 'add'}
                data-popup-open={open === 'add' || undefined}
                popoverTarget={ADD_ID}
              >
                <PlusIcon />
              </AddButton>
            </Tooltip>
            <LabelButton
              open={searchOpen}
              aria-haspopup="dialog"
              aria-expanded={searchOpen}
              onClick={onSearch}
            >
              <SearchIcon />
              {t('shellAlpha.search', 'Search')}
            </LabelButton>
            <HistoryControls onApplied={onHistoryApplied} onReveal={onReveal} />
          </BarPill>
          {node && (
            <NodePill
              node={node}
              hasSettings={hasSettings !== false}
              settingsOpen={propertiesOpen}
              onToggleSettings={onToggleProperties}
            />
          )}
        </div>
      </div>
      {dropped && (
        <CreateNodeFlow
          request={dropped}
          nodeTypes={nodeTypes}
          onCreated={(created) => {
            setDropped(null)
            nodesEdited([dropped.parentAddress])
            fetchNode(nodeAddressOf(created) as NodeAddress)
              .then(inspectNode)
              .catch(() => inspectNode(created))
          }}
          onCancel={(error) => {
            if (error)
              toast.error(error, {
                title: t('creation.creatingFailed', 'Creating failed'),
              })
            setDropped(null)
          }}
        />
      )}
      <NativePopover
        id={ADD_ID}
        anchor={BARS_ANCHOR}
        placement={ADD_PLACEMENT}
        open={open === 'add' && selectedDocument !== null}
        onOpenChange={(value) => popoverChanged('add', value)}
      >
        {selectedDocument && (
          <AddMenu
            document={selectedDocument}
            node={node}
            at={addAt}
            onClose={() => setOpen(null)}
            onUpload={() => {
              setOpen(null)
              onOpenMode('media-library')
            }}
          />
        )}
      </NativePopover>
    </div>
  )
}

/**
 * Faded while the page scrolls; back when it stops, the pointer nears the
 * bottom, the selection changes or something is open.
 */
function useFade(pinned: boolean, selection: string | null): boolean {
  const [scrolling, setScrolling] = React.useState(false)
  const [near, setNear] = React.useState(false)
  React.useEffect(() => {
    let timer: number | undefined
    const offScroll = onPreviewScroll(() => {
      setScrolling(true)
      window.clearTimeout(timer)
      timer = window.setTimeout(() => setScrolling(false), FADE_SETTLE_MS)
    })
    const offPointer = onPreviewPointerNearBottom(setNear)
    return () => {
      offScroll()
      offPointer()
      window.clearTimeout(timer)
    }
  }, [])
  const [lastSelection, setLastSelection] = React.useState(selection)
  if (lastSelection !== selection) {
    setLastSelection(selection)
    setScrolling(false)
  }
  return scrolling && !near && !pinned
}

function HistoryControls({
  onApplied,
  onReveal,
}: {
  onApplied: () => void
  onReveal: (location: HistoryLocation) => void
}) {
  const { workspaceName, selectedDocument } = useStudio()
  const contentRepositoryId = useActiveContentRepositoryId()
  const workspace =
    contentRepositoryId && workspaceName
      ? { contentRepositoryId, workspaceName }
      : null
  const { undoLabel, undoLocation, redoLabel, redoLocation, running } =
    useHistory(workspace)
  if (!workspace) return null

  const run = (direction: 'undo' | 'redo') => {
    const action = direction === 'undo' ? undo : redo
    action(workspace)
      .then((location) => {
        onApplied()
        if (location) onReveal(location)
      })
      .catch((error: unknown) => {
        toast.error(error, {
          title:
            direction === 'undo'
              ? t('undo.undoFailed', 'Undo failed')
              : t('undo.redoFailed', 'Redo failed'),
        })
        onApplied()
      })
  }
  const describe = (label: string, location: HistoryLocation | null) =>
    location?.node &&
    location.document.nodeAggregateId !== selectedDocument?.nodeAggregateId
      ? t('undo.onPage', '{0} (on “{1}”)', [label, location.documentLabel])
      : label

  return (
    <>
      <Tooltip
        label={
          undoLabel === null
            ? t('undo.nothingToUndo', 'Nothing to undo')
            : t('undo.undoAction', 'Undo: {0}', [
                describe(undoLabel, undoLocation),
              ])
        }
      >
        <IconButton
          disabled={running || undoLabel === null}
          onClick={() => run('undo')}
          aria-label={t('undo.undo', 'Undo')}
        >
          <UndoIcon />
        </IconButton>
      </Tooltip>
      {redoLabel !== null && (
        <Tooltip
          label={t('undo.redoAction', 'Redo: {0}', [
            describe(redoLabel, redoLocation),
          ])}
        >
          <IconButton
            disabled={running}
            onClick={() => run('redo')}
            aria-label={t('undo.redo', 'Redo')}
          >
            <RedoIcon />
          </IconButton>
        </Tooltip>
      )}
    </>
  )
}

function NodePill({
  node,
  hasSettings,
  settingsOpen,
  onToggleSettings,
}: {
  node: Node
  hasSettings: boolean
  /** The Properties panel is open - it shows the selected node. */
  settingsOpen: boolean
  onToggleSettings: () => void
}) {
  const { data: nodeTypes } = useNodeTypes()
  const { inspectNode } = useStudio()
  const typeLabel = nodeTypes?.get(node.nodeType)?.label ?? node.nodeType
  const pillRef = React.useRef<HTMLDivElement>(null)
  const pathTooltip = useTooltip(
    t('shellAlpha.selectionPath', 'Selection path'),
  )
  const { data: ancestors } = useNodeAncestors(nodeAddressOf(node))
  const parent = ancestors?.[0] ?? null

  useKeyboardShortcut({
    id: 'shellAlpha.selectParent',
    combo: 'alt+arrowup',
    title: t('shellAlpha.selectParent', 'Select the parent element'),
    category: t('shortcuts.category.editing', 'Editing'),
    handler: () => {
      if (!parent || !nodeTypes) return false
      if (isOfType(nodeTypes, parent.nodeType, DOCUMENT_NODE_TYPE)) return false
      inspectNode(parent)
    },
  })

  return (
    <BarPill ref={pillRef} {...anchorProps(NODE_PILL_ANCHOR)}>
      {pathTooltip.tooltip}
      <PathMenu
        node={node}
        side="top"
        sideOffset={14}
        trigger={
          <button
            type="button"
            className="inline-flex h-9 cursor-pointer items-center gap-1.75 rounded-full px-2.5 type-shell-control font-medium text-shell-text outline-none hover:bg-shell-hover focus-visible:ring-2 focus-visible:ring-shell-accent/60 data-popup-open:bg-shell-hover"
            {...pathTooltip.props}
          >
            <NodeTypeIcon
              nodeTypes={nodeTypes}
              nodeTypeName={node.nodeType}
              className="type-icon-s text-shell-muted"
            />
            <span className="max-w-40 truncate">{typeLabel}</span>
            <ChevronDownIcon className="text-shell-muted" />
          </button>
        }
      />
      {node.isHidden && (
        <span className="flex h-5.5 shrink-0 items-center gap-1.25 rounded-full bg-shell-hover-inset pr-2 pl-1.75 text-[0.6875rem] leading-3.5 font-medium text-shell-quiet">
          <EyeOffIcon width={12} height={10} strokeWidth={1.4} />
          {t('shellAlpha.element.hidden', 'Hidden')}
        </span>
      )}
      {hasSettings && (
        <LabelButton
          open={settingsOpen}
          aria-expanded={settingsOpen}
          onClick={onToggleSettings}
          className="gap-1.75 pr-3.25 pl-2.75"
        >
          <SettingsIcon />
          {t('shellAlpha.settings', 'Settings')}
        </LabelButton>
      )}
      <ElementMenu
        node={node}
        parent={parent}
        pill={pillRef}
        pillAnchor={NODE_PILL_ANCHOR}
      />
    </BarPill>
  )
}

/**
 * Where Add inserts: next to the selected content element, or - with only
 * the page selected - inside its main content collection.
 */
function useInsertTarget(
  document: Node,
  node: Node | null,
): { request: InsertRequest; label: string } | null {
  const { data: children } = useQuery({
    queryKey: [
      ...neosKeys.nodes.node(nodeAddressOf(document)),
      'alpha-add-target',
    ],
    queryFn: () => fetchChildren(nodeAddressOf(document)),
    enabled: node === null,
  })
  if (node) {
    return {
      request: { referenceAddress: nodeAddressOf(node), defaultMode: 'after' },
      label: node.label || node.nodeAggregateId,
    }
  }
  const collection =
    children?.find((child) => child.name === 'main') ??
    children?.find((child) => child.classification === 'tethered')
  if (!collection) return null
  return {
    request: {
      referenceAddress: nodeAddressOf(collection),
      parentAddress: nodeAddressOf(document),
      defaultMode: 'inside',
    },
    label: collection.label || collection.name || '',
  }
}

function AddMenu({
  document,
  node,
  at,
  onClose,
  onUpload,
}: {
  document: Node
  node: Node | null
  /** A position picked elsewhere (an Outline row), over the selection's. */
  at: AddRequest | null
  onClose: () => void
  onUpload: () => void
}) {
  const selectionTarget = useInsertTarget(document, node)
  const target = at
    ? {
        request: {
          referenceAddress: nodeAddressOf(at.node),
          defaultMode: at.mode,
        },
        label: at.node.label || at.node.nodeAggregateId,
      }
    : selectionTarget
  const [pageRequest, setPageRequest] = React.useState<InsertRequest | null>(
    null,
  )
  const { selectDocument, nodesEdited } = useStudio()
  const dragging = usePreviewChrome().typeDrag !== null
  React.useEffect(() => () => setPreviewChrome({ typeDrag: null }), [])
  return (
    <>
      <Surface
        className={cn(
          'flex max-h-[min(36rem,calc(100svh-12rem))] w-100 flex-col overflow-hidden transition-opacity',
          // While a type is dragged into the page, the page shows through.
          dragging && 'pointer-events-none opacity-25',
        )}
      >
        {target ? (
          <AddMenuBody
            key={JSON.stringify([
              target.request.referenceAddress,
              target.request.defaultMode,
            ])}
            request={target.request}
            referenceLabel={target.label}
            onCreated={onClose}
          />
        ) : (
          <div className="p-4 type-shell-secondary text-shell-muted">
            {t('shellAlpha.addLoading', 'Loading…')}
          </div>
        )}
        <div className="flex flex-col border-t border-shell-border-strong p-1.5">
          <AddRow
            icon={<PageIcon />}
            label={t('shellAlpha.addPage', 'Page')}
            hint={t('shellAlpha.addPageBelow', 'below {0}', [
              document.label || document.nodeAggregateId,
            ])}
            onClick={() =>
              setPageRequest({
                referenceAddress: nodeAddressOf(document),
                defaultMode: 'inside',
              })
            }
          />
          <AddRow
            icon={<UploadIcon />}
            label={t('shellAlpha.uploadAsset', 'Upload asset')}
            hint={t('shellAlpha.toMedia', 'to Media')}
            onClick={onUpload}
          />
        </div>
      </Surface>
      <InsertNodeDialog
        request={pageRequest}
        role="document"
        onCreated={(created, creation) => {
          setPageRequest(null)
          onClose()
          nodesEdited([creation.parentAddress])
          selectDocument(created)
        }}
        onClose={() => setPageRequest(null)}
      />
    </>
  )
}

function AddRow({
  icon,
  label,
  hint,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  hint: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-9.5 cursor-pointer items-center gap-2.5 rounded-shell-control px-2 text-left outline-none hover:bg-shell-ground focus-visible:bg-shell-ground"
    >
      <span className="flex size-6.5 shrink-0 items-center justify-center rounded-shell-control bg-shell-tile text-shell-text">
        {icon}
      </span>
      <span className="flex-1 type-shell-control text-shell-text">{label}</span>
      <span className="type-shell-secondary text-shell-subtle">{hint}</span>
    </button>
  )
}

const MODES: InsertMode[] = ['before', 'after', 'inside']

function AddMenuBody({
  request,
  referenceLabel,
  onCreated,
}: {
  request: InsertRequest
  referenceLabel: string
  onCreated: () => void
}) {
  const insertion = useInsertion(request, 'content')
  const {
    activeMode,
    setSelectedMode,
    filter,
    setFilter,
    modeGroups,
    visibleGroups,
    creatable,
    creation,
    setCreation,
    pick,
    query,
  } = insertion
  const { nodesEdited, inspectNode } = useStudio()
  const [groupName, setGroupName] = React.useState<string | null>(null)
  const openGroup =
    query === ''
      ? (visibleGroups?.find((group) => group.name === groupName) ?? null)
      : null

  // The insert line in the preview, while the menu is open.
  const aggregateId = request.referenceAddress.nodeAggregateId
  const dragging = usePreviewChrome().typeDrag !== null
  React.useEffect(() => {
    setPreviewChrome({
      insertPreview: dragging ? null : { aggregateId, mode: activeMode },
    })
    return () => setPreviewChrome({ insertPreview: null })
  }, [aggregateId, activeMode, dragging])

  const modeLabels: Record<InsertMode, string> = {
    before: t('creation.mode.before', 'Before'),
    after: t('creation.mode.after', 'After'),
    inside: t('creation.mode.inside', 'Inside'),
  }

  return (
    <>
      <label className="flex h-11 shrink-0 items-center gap-2 border-b border-shell-border-strong px-3.5 text-shell-muted">
        <SearchIcon width={13} height={13} strokeWidth={1.5} />
        <input
          autoFocus
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder={t('shellAlpha.searchTypes', 'Search element types…')}
          className="min-w-0 flex-1 bg-transparent type-shell-control text-shell-text outline-none placeholder:text-shell-disabled"
        />
      </label>
      {openGroup ? (
        <GroupView
          group={openGroup}
          nodeTypes={creatable?.nodeTypes}
          onBack={() => setGroupName(null)}
          onPick={(name) => void pick(name)}
        />
      ) : (
        <div className="flex min-h-0 flex-col gap-2.5 overflow-y-auto px-3 pt-3 pb-3.5">
          <div className="flex items-center justify-between gap-2 px-0.5">
            <div className="flex min-w-0 flex-col">
              <span className="type-shell-secondary font-semibold text-shell-text">
                {t('shellAlpha.content', 'Content')}
              </span>
              <span className="truncate text-[0.6875rem] leading-3.5 text-shell-subtle">
                {t('shellAlpha.relativeTo', 'relative to “{0}”', [
                  referenceLabel,
                ])}
              </span>
            </div>
            <div
              role="radiogroup"
              className="flex shrink-0 gap-0.5 rounded-shell-control bg-shell-input p-0.75"
            >
              {MODES.map((mode) => {
                const available = (modeGroups[mode]?.length ?? 0) > 0
                const active = mode === activeMode
                return (
                  <button
                    key={mode}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    disabled={!available}
                    onClick={() => setSelectedMode(mode)}
                    className={cn(
                      'flex h-6 cursor-pointer items-center rounded-shell-segment px-2.5 type-shell-secondary outline-none focus-visible:ring-2 focus-visible:ring-shell-accent/60 disabled:cursor-default disabled:text-shell-faint',
                      active
                        ? 'bg-shell-hover-inset font-medium text-shell-text'
                        : 'text-shell-muted hover:text-shell-text',
                    )}
                  >
                    {modeLabels[mode]}
                  </button>
                )
              })}
            </div>
          </div>
          {visibleGroups === null ? (
            <p className="px-0.5 type-shell-secondary text-shell-muted">
              {t('shellAlpha.addLoading', 'Loading…')}
            </p>
          ) : visibleGroups.length === 0 ? (
            <p className="px-0.5 type-shell-secondary text-shell-muted">
              {t('creation.noTypesAllowed', 'Nothing can be created here.')}
            </p>
          ) : query !== '' ? (
            <div className="flex flex-col">
              {visibleGroups
                .flatMap((group) => group.nodeTypes)
                .map((nodeType) => (
                  <TypeRow
                    key={nodeType.name}
                    name={nodeType.name}
                    label={nodeType.label}
                    nodeTypes={creatable?.nodeTypes}
                    onPick={(name) => void pick(name)}
                  />
                ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {visibleGroups.map((group) => (
                <button
                  key={group.name}
                  type="button"
                  onClick={() => setGroupName(group.name)}
                  className="flex h-15.5 w-30 cursor-pointer flex-col items-center justify-center gap-1.25 rounded-shell-control border border-transparent bg-shell-tile text-shell-text outline-none hover:border-shell-border-strong hover:bg-shell-ground focus-visible:ring-2 focus-visible:ring-shell-accent/60"
                >
                  {group.nodeTypes[0] && (
                    <NodeTypeIcon
                      nodeTypes={creatable?.nodeTypes}
                      nodeTypeName={group.nodeTypes[0].name}
                      className="type-icon-s"
                    />
                  )}
                  <span className="flex items-baseline gap-1.25">
                    <span className="max-w-22 truncate type-shell-secondary">
                      {group.label}
                    </span>
                    <span className="text-[0.6875rem] leading-3.5 text-shell-disabled">
                      {group.nodeTypes.length}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {creation && (
        <CreateNodeFlow
          request={creation}
          nodeTypes={creatable?.nodeTypes}
          onCreated={(created) => {
            onCreated()
            nodesEdited([creation.parentAddress])
            fetchNode(nodeAddressOf(created) as NodeAddress)
              .then(inspectNode)
              .catch(() => inspectNode(created))
          }}
          onCancel={(error) => {
            if (error)
              toast.error(error, {
                title: t('creation.creatingFailed', 'Creating failed'),
              })
            setCreation(null)
          }}
        />
      )}
    </>
  )
}

function GroupView({
  group,
  nodeTypes,
  onBack,
  onPick,
}: {
  group: CreatableNodeTypeGroup
  nodeTypes: ReturnType<typeof useNodeTypes>['data']
  onBack: () => void
  onPick: (name: string) => void
}) {
  return (
    <div className="flex min-h-0 flex-col">
      <div className="flex h-11 shrink-0 items-center gap-2 border-b border-shell-border-strong px-2">
        <button
          type="button"
          onClick={onBack}
          aria-label={t('shellAlpha.back', 'Back')}
          className="flex size-7 cursor-pointer items-center justify-center rounded-shell-control bg-shell-ground text-shell-text outline-none hover:bg-shell-hover focus-visible:ring-2 focus-visible:ring-shell-accent/60"
        >
          <BackIcon />
        </button>
        <span className="type-shell-control font-semibold text-shell-text">
          {group.label}
        </span>
        <span className="type-shell-secondary text-shell-subtle">
          {t('shellAlpha.typeCount', '{0} types', [group.nodeTypes.length])}
        </span>
      </div>
      <div className="flex flex-col overflow-y-auto p-1.5">
        {group.nodeTypes.map((nodeType) => (
          <TypeRow
            key={nodeType.name}
            name={nodeType.name}
            label={nodeType.label}
            nodeTypes={nodeTypes}
            onPick={onPick}
          />
        ))}
      </div>
    </div>
  )
}

function TypeRow({
  name,
  label,
  nodeTypes,
  onPick,
}: {
  name: string
  label: string
  nodeTypes: ReturnType<typeof useNodeTypes>['data']
  onPick: (name: string) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onPick(name)}
      draggable
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = 'copy'
        event.dataTransfer.setData('text/plain', name)
        // Not in the dragstart itself: the menu turns see-through for the
        // drop, and changing the drag source right away cancels the drag.
        window.setTimeout(() => setPreviewChrome({ typeDrag: name }))
      }}
      onDragEnd={() => setPreviewChrome({ typeDrag: null })}
      className="flex h-12 shrink-0 cursor-pointer items-center gap-3 rounded-shell-control px-2.5 text-left outline-none hover:bg-shell-ground focus-visible:bg-shell-ground active:cursor-grabbing"
    >
      <span className="flex size-7.5 shrink-0 items-center justify-center rounded-shell-control bg-shell-input text-shell-text">
        <NodeTypeIcon
          nodeTypes={nodeTypes}
          nodeTypeName={name}
          className="type-icon-s"
        />
      </span>
      <span className="truncate type-shell-control text-shell-text">
        {label}
      </span>
    </button>
  )
}
