import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Select as SelectPrimitive } from '@base-ui/react/select'
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
import { permittedActionsOn } from '@/features/access/permittedActions'
import { CreateNodeFlow } from '@/features/creation/NodeCreationDialog'
import {
  InsertNodeDialog,
  type InsertMode,
  type InsertRequest,
  useInsertion,
} from '@/features/creation/InsertNodeDialog'
import type { CreatableNodeTypeGroup } from '@/features/creation/creatableNodeTypes'
import {
  NodeContextMenu,
  type NodeMenuTarget,
} from '@/features/editing/NodeContextMenu'
import { redo, undo, useHistory } from '@/features/history/historyStore'
import type { HistoryLocation } from '@/features/history/location'
import { InspectorPanel } from '@/features/inspector/Inspector'
import { buildInspectorSchema } from '@/features/inspector/inspectorSchema'
import { PanelBody } from '@/features/panels/PanelSystem'
import { panelRegistry } from '@/features/panels/registry'
import {
  onPreviewEscape,
  onPreviewPointerNearBottom,
  onPreviewScroll,
  setPreviewChrome,
} from '@/features/preview/chromeStore'
import { useKeyboardShortcut } from '@/features/shortcuts/useKeyboardShortcut'
import { NodeTypeIcon } from '@/features/tree/nodeTypeIcon'
import { translate as t } from '@/lib/i18n'
import { useRegistry } from '@/lib/registry'
import { cn } from '@/lib/utils'
import {
  BackIcon,
  CheckIcon,
  ChevronDownIcon,
  KeepOpenIcon,
  CloseIcon,
  CopyIcon,
  DoubleChevronIcon,
  MoreIcon,
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
import { PathMenu } from './PathMenu'
import { useTrayOnSelection } from './preferences'
import { containedPortal } from '@/lib/portalContainer'

const SelectPortalContained = containedPortal(SelectPrimitive.Portal)

type Open = 'settings' | 'add' | 'search' | null

/** The bar's height plus its distance from the card's bottom edge. */
const BAR_SPACE = 64
/** How long the bar stays faded after the page stopped scrolling. */
const FADE_SETTLE_MS = 450
const ADD_ID = 'shell-alpha-add-menu'
const SEARCH_ID = 'shell-alpha-search'
const POPOVER_IDS = [ADD_ID, SEARCH_ID]
const BARS_ANCHOR = '--shell-alpha-bars'
const GLOBAL_ANCHOR = '--shell-alpha-global-pill'
/** As drawn: 8px above the bars, its left edge 235px left of their centre. */
const ADD_PLACEMENT: Placement = {
  side: 'top',
  align: 'center',
  offset: 8,
  shift: -235,
}
const SEARCH_PLACEMENT: Placement = { side: 'top', align: 'start', offset: 8 }

/**
 * The floating action bar (R9 variant D): a global pill - Add, Search,
 * Undo/Redo - and, while a content element is selected, a node pill with
 * its type, Settings, Copy for MCP and more. Settings and Add open their
 * surfaces attached above the bar.
 */
export function ActionBar({
  onOpenPanel,
  onOpenMode,
  onHistoryApplied,
  onReveal,
  propertiesDocked,
  onKeepOpen,
}: {
  onOpenPanel: (panel: string) => void
  /** The Properties panel is docked: selecting no longer opens the tray. */
  propertiesDocked: boolean
  /** "Keep open": dock the tray's fields as the Properties panel. */
  onKeepOpen: () => void
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
  // A tray about a node closes with its selection.
  const nodeKey = node?.nodeAggregateId ?? null
  const [trayOnSelection] = useTrayOnSelection()
  const [trayNode, setTrayNode] = React.useState(nodeKey)
  if (trayNode !== nodeKey) {
    setTrayNode(nodeKey)
    if (nodeKey !== null && trayOnSelection && !propertiesDocked)
      setOpen('settings')
    else if (open === 'settings') setOpen(null)
  }

  React.useEffect(() => onPreviewEscape(() => setOpen(null)), [])
  useKeyboardShortcut({
    id: 'shellAlpha.closeSurface',
    combo: 'escape',
    title: t('shellAlpha.closeTray', 'Close the tray or menu'),
    category: t('shortcuts.category.editing', 'Editing'),
    handler: () => {
      if (open === null) return false
      setOpen(null)
    },
  })

  const faded = useFade(open !== null, nodeKey)

  // What the bar and its open surface cover, for the page's scroll space
  // and for keeping the selection in view above them.
  // The Add menu and Search are native popovers in the top layer, outside
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

  const toggle = (which: Exclude<Open, null>) =>
    setOpen((current) => (current === which ? null : which))
  // The browser opened or light-dismissed one of the popovers.
  const popoverChanged = (which: 'add' | 'search', value: boolean) =>
    setOpen((current) => (value ? which : current === which ? null : current))

  return (
    <div
      ref={stackRef}
      className={cn(
        'pointer-events-none absolute inset-x-0 bottom-4 z-10 flex flex-col items-center gap-2 px-4 transition-[opacity,translate] duration-200',
        faded && 'translate-y-2 opacity-0',
      )}
    >
      <div className="pointer-events-auto flex max-w-full flex-col items-center gap-2 *:max-w-full">
        {open === 'settings' && node && (
          <SettingsTray
            key={node.nodeAggregateId}
            node={node}
            onClose={() => setOpen(null)}
            onOpenInspector={() => {
              setOpen(null)
              onOpenPanel('inspector')
            }}
            onKeepOpen={() => {
              setOpen(null)
              onKeepOpen()
            }}
          />
        )}
        <div className="flex items-center gap-2" {...anchorProps(BARS_ANCHOR)}>
          <BarPill {...anchorProps(GLOBAL_ANCHOR)}>
            <AddButton
              aria-label={t('shellAlpha.add', 'Add')}
              title={t('shellAlpha.add', 'Add')}
              aria-expanded={open === 'add'}
              data-popup-open={open === 'add' || undefined}
              popoverTarget={ADD_ID}
            >
              <PlusIcon />
            </AddButton>
            <LabelButton
              open={open === 'search'}
              aria-expanded={open === 'search'}
              popoverTarget={SEARCH_ID}
            >
              <SearchIcon />
              {t('shellAlpha.search', 'Search')}
            </LabelButton>
            <HistoryControls onApplied={onHistoryApplied} onReveal={onReveal} />
          </BarPill>
          {node && (
            <NodePill
              node={node}
              settingsOpen={open === 'settings'}
              onToggleSettings={() => toggle('settings')}
            />
          )}
        </div>
      </div>
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
            onClose={() => setOpen(null)}
            onUpload={() => {
              setOpen(null)
              onOpenMode('media-library')
            }}
          />
        )}
      </NativePopover>
      <NativePopover
        id={SEARCH_ID}
        anchor={GLOBAL_ANCHOR}
        placement={SEARCH_PLACEMENT}
        open={open === 'search'}
        onOpenChange={(value) => popoverChanged('search', value)}
      >
        <SearchSurface />
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
      <IconButton
        disabled={running || undoLabel === null}
        onClick={() => run('undo')}
        title={
          undoLabel === null
            ? t('undo.nothingToUndo', 'Nothing to undo')
            : t('undo.undoAction', 'Undo: {0}', [
                describe(undoLabel, undoLocation),
              ])
        }
        aria-label={t('undo.undo', 'Undo')}
      >
        <UndoIcon />
      </IconButton>
      {redoLabel !== null && (
        <IconButton
          disabled={running}
          onClick={() => run('redo')}
          title={t('undo.redoAction', 'Redo: {0}', [
            describe(redoLabel, redoLocation),
          ])}
          aria-label={t('undo.redo', 'Redo')}
        >
          <RedoIcon />
        </IconButton>
      )}
    </>
  )
}

function NodePill({
  node,
  settingsOpen,
  onToggleSettings,
}: {
  node: Node
  settingsOpen: boolean
  onToggleSettings: () => void
}) {
  const { data: nodeTypes } = useNodeTypes()
  const { inspectNode, nodeEdited, nodesEdited } = useStudio()
  const typeLabel = nodeTypes?.get(node.nodeType)?.label ?? node.nodeType
  const [menu, setMenu] = React.useState<NodeMenuTarget | null>(null)
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

  const copyForAssistant = () => {
    const text = [
      `Neos node "${node.label || node.nodeAggregateId}" (${node.nodeType})`,
      `nodeAggregateId: ${node.nodeAggregateId}`,
      `workspaceName: ${node.workspaceName}`,
      `dimensionSpacePoint: ${node.dimensionSpacePoint}`,
      `contentRepositoryId: ${node.contentRepositoryId}`,
    ].join('\n')
    navigator.clipboard
      .writeText(text)
      .then(() =>
        toast.success(
          t('shellAlpha.copiedForMcp', 'Copied “{0}” for your assistant', [
            typeLabel,
          ]),
        ),
      )
      .catch((error: unknown) => toast.error(error))
  }

  return (
    <BarPill>
      <PathMenu
        node={node}
        side="top"
        sideOffset={14}
        trigger={
          <button
            type="button"
            className="inline-flex h-9 cursor-pointer items-center gap-1.75 rounded-full px-2.5 type-shell-control font-medium text-shell-text outline-none hover:bg-shell-hover focus-visible:ring-2 focus-visible:ring-shell-accent/60 data-popup-open:bg-shell-hover"
            title={t('shellAlpha.selectionPath', 'Selection path')}
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
      <IconButton
        open={settingsOpen}
        aria-expanded={settingsOpen}
        onClick={onToggleSettings}
        title={t('shellAlpha.settings', 'Settings')}
        aria-label={t('shellAlpha.settings', 'Settings')}
      >
        <SettingsIcon />
      </IconButton>
      <IconButton
        onClick={copyForAssistant}
        title={t('shellAlpha.copyForMcp', 'Copy for MCP')}
        aria-label={t('shellAlpha.copyForMcp', 'Copy for MCP')}
      >
        <CopyIcon />
      </IconButton>
      <IconButton
        open={menu !== null}
        title={t('actions.more', 'More actions')}
        aria-label={t('actions.more', 'More actions')}
        onClick={(event) => {
          if (menu) return setMenu(null)
          const rect = event.currentTarget.getBoundingClientRect()
          setMenu({
            address: nodeAddressOf(node),
            node,
            parentAddress: parent ? nodeAddressOf(parent) : null,
            hidden: node.isHidden,
            tethered: node.classification === 'tethered',
            permitted: permittedActionsOn(node),
            anchor: {
              x: rect.left,
              y: rect.top,
              width: rect.width,
              height: rect.height,
            },
          })
        }}
      >
        <MoreIcon />
      </IconButton>
      <NodeContextMenu
        target={menu}
        surface="preview"
        entityLabel={t('editing.entity.element', 'element')}
        clipboardKind="content"
        onClose={() => setMenu(null)}
        onPasted={(affected) => nodesEdited(affected)}
        onDone={(action, targets) => {
          const target = targets[0]
          if (!target) return
          if (action === 'delete') {
            nodesEdited(target.parentAddress ? [target.parentAddress] : [])
            if (target.parentAddress)
              fetchNode(target.parentAddress)
                .then(inspectNode)
                .catch(() => {})
          } else {
            nodeEdited(target.address, { reload: 'element' })
          }
        }}
      />
    </BarPill>
  )
}

const FULL_INSPECTOR = '__full-inspector'

/** Attached above the bar: one inspector group's fields in a row. */
function SettingsTray({
  node,
  onClose,
  onOpenInspector,
  onKeepOpen,
}: {
  node: Node
  onClose: () => void
  onOpenInspector: () => void
  onKeepOpen: () => void
}) {
  const { data: nodeTypes } = useNodeTypes()
  const { data: nodeType } = useNodeType(node.nodeType)
  const { nodeEdited } = useStudio()
  const groups = React.useMemo(
    () =>
      nodeType
        ? buildInspectorSchema(nodeType).flatMap((tab) => tab.groups)
        : [],
    [nodeType],
  )
  const [groupId, setGroupId] = React.useState<string | null>(null)
  const group = groups.find((entry) => entry.id === groupId) ?? groups[0]
  const typeLabel = nodeTypes?.get(node.nodeType)?.label ?? node.nodeType

  return (
    <Surface className="flex w-[32.6875rem] flex-col">
      <div className="flex h-12 shrink-0 items-center justify-between pr-2 pl-3.5">
        <div className="flex min-w-0 items-center gap-2">
          <NodeTypeIcon
            nodeTypes={nodeTypes}
            nodeTypeName={node.nodeType}
            className="type-icon-s text-shell-text"
          />
          <span className="truncate type-shell-control font-semibold">
            {typeLabel}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {group && (
            <SelectPrimitive.Root
              value={group.id}
              onValueChange={(value) => {
                if (value === FULL_INSPECTOR) onOpenInspector()
                else setGroupId(value as string)
              }}
            >
              <SelectPrimitive.Trigger className="flex h-7 cursor-pointer items-center gap-1.5 rounded-shell-control bg-shell-ground pr-2 pl-2.5 type-shell-secondary text-shell-text outline-none hover:bg-shell-hover focus-visible:ring-2 focus-visible:ring-shell-accent/60">
                {group.label}
                <ChevronDownIcon className="text-shell-muted" />
              </SelectPrimitive.Trigger>
              <SelectPortalContained>
                <SelectPrimitive.Positioner
                  side="top"
                  align="end"
                  sideOffset={6}
                  alignItemWithTrigger={false}
                  className="z-200 outline-none"
                >
                  <SelectPrimitive.Popup className="w-50 origin-(--transform-origin) rounded-shell-surface border border-white/8 bg-shell-ground p-1 shadow-shell-surface outline-none">
                    {groups.map((entry) => (
                      <SelectPrimitive.Item
                        key={entry.id}
                        value={entry.id}
                        className="flex h-8 cursor-default items-center justify-between gap-2 rounded-shell-control px-2.5 type-shell-secondary text-shell-text outline-none select-none data-highlighted:bg-shell-hover data-selected:bg-shell-hover"
                      >
                        <span className="truncate">{entry.label}</span>
                        {entry.id === group.id ? (
                          <span className="text-shell-accent-light">
                            <CheckIcon />
                          </span>
                        ) : (
                          <span className="text-[0.6875rem] leading-3.5 text-shell-disabled">
                            {entry.items.length}
                          </span>
                        )}
                      </SelectPrimitive.Item>
                    ))}
                    <div className="mx-1.5 my-1 h-px bg-white/8" />
                    <SelectPrimitive.Item
                      value={FULL_INSPECTOR}
                      className="flex h-8 cursor-default items-center gap-2 rounded-shell-control px-2.5 type-shell-secondary text-shell-accent-light outline-none select-none data-highlighted:bg-shell-hover"
                    >
                      <DoubleChevronIcon />
                      {t('shellAlpha.openFullInspector', 'Open full inspector')}
                    </SelectPrimitive.Item>
                  </SelectPrimitive.Popup>
                </SelectPrimitive.Positioner>
              </SelectPortalContained>
            </SelectPrimitive.Root>
          )}
          <button
            type="button"
            onClick={onKeepOpen}
            title={t(
              'shellAlpha.keepOpenHint',
              'Keep the properties open in a panel on the left',
            )}
            className="flex h-7 cursor-pointer items-center gap-1.5 rounded-full pr-2.5 pl-2 type-shell-secondary text-shell-muted outline-none hover:bg-shell-hover hover:text-shell-text focus-visible:ring-2 focus-visible:ring-shell-accent/60"
          >
            <KeepOpenIcon />
            {t('shellAlpha.keepOpen', 'Keep open')}
          </button>
          <IconButton
            size="sm"
            className="size-7 text-shell-muted"
            onClick={onClose}
            aria-label={t('common.close', 'Close')}
          >
            <CloseIcon />
          </IconButton>
        </div>
      </div>
      <div className="max-h-[50svh] overflow-y-auto px-3.5 pt-1 pb-3.5">
        <InspectorPanel
          node={node}
          onNodeEdited={nodeEdited}
          trayGroup={group?.id ?? null}
        />
      </div>
      <button
        type="button"
        onClick={onOpenInspector}
        className="flex h-10 shrink-0 cursor-pointer items-center justify-between border-t border-shell-border-strong px-3.5 type-shell-secondary text-shell-accent-light outline-none hover:bg-shell-hover-inset focus-visible:bg-shell-hover-inset"
      >
        {t('shellAlpha.allProperties', 'All properties')}
        <svg
          width="10"
          height="9"
          viewBox="0 0 10 9"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden
        >
          <path d="M0 4.5h8.5M5 1l3.5 3.5L5 8" />
        </svg>
      </button>
    </Surface>
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
  onClose,
  onUpload,
}: {
  document: Node
  node: Node | null
  onClose: () => void
  onUpload: () => void
}) {
  const target = useInsertTarget(document, node)
  const [pageRequest, setPageRequest] = React.useState<InsertRequest | null>(
    null,
  )
  const { selectDocument, nodesEdited } = useStudio()
  return (
    <>
      <Surface className="flex max-h-[min(36rem,calc(100svh-12rem))] w-100 flex-col overflow-hidden">
        {target ? (
          <AddMenuBody
            key={JSON.stringify(target.request.referenceAddress)}
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
  React.useEffect(() => {
    setPreviewChrome({ insertPreview: { aggregateId, mode: activeMode } })
    return () => setPreviewChrome({ insertPreview: null })
  }, [aggregateId, activeMode])

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
      className="flex h-12 shrink-0 cursor-pointer items-center gap-3 rounded-shell-control px-2.5 text-left outline-none hover:bg-shell-ground focus-visible:bg-shell-ground"
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

/**
 * Search: Studio has no global search yet - the closest is the Documents
 * panel's page search, shown here above the bar.
 */
function SearchSurface() {
  const panels = useRegistry(panelRegistry)
  const documents = panels.find((definition) => definition.id === 'documents')
  const ref = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    ref.current?.querySelector<HTMLInputElement>('input')?.focus()
  }, [])
  if (!documents) return null
  return (
    <Surface className="flex h-[min(30rem,calc(100svh-12rem))] w-95 flex-col overflow-hidden">
      <div ref={ref} className="min-h-0 flex-1 overflow-y-auto">
        <PanelBody
          panel={documents.id}
          component={documents.component}
          visible
        />
      </div>
    </Surface>
  )
}
