import * as React from 'react'
import { Menu as MenuPrimitive } from '@base-ui/react/menu'
import { fetchNode, useAllowedChildNodeTypes } from '@/api/neos/endpoints/nodes'
import {
  configuredLabel,
  useNodeType,
  useNodeTypeGroups,
  useNodeTypes,
} from '@/api/neos/endpoints/nodeTypes'
import {
  type Node,
  nodeAddressOf,
  type NodeType,
  nodeTypeConfiguration,
} from '@/api/neos/schema'
import { useStudio } from '@/app/StudioContext'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { toast } from '@/components/ui/toast'
import { NodeActionMenuItems } from '@/features/actions/NodeActionMenuItems'
import { permittedActionsOn } from '@/features/access/permittedActions'
import { clipboardAdd } from '@/features/clipboard/clipboardStore'
import {
  pasteClipboardEntry,
  resolveSucceedingSibling,
} from '@/features/clipboard/paste'
import {
  changeNodeType,
  deleteNodes,
  hideNodes,
  unhideNodes,
} from '@/features/editing/nodeActions'
import { persistPropertyChange } from '@/features/editing/persistProperty'
import {
  buildInspectorSchema,
  humanizeLabel,
  type InspectorProperty,
} from '@/features/inspector/inspectorSchema'
import { PropertyEditor } from '@/features/inspector/PropertyEditor'
import { NodeTypeIcon } from '@/features/tree/nodeTypeIcon'
import { useDocumentPendingEvents } from '@/features/workspaces/historyData'
import { relativeTime } from '@/features/workspaces/historyLabels'
import { translate as t } from '@/lib/i18n'
import { containedPortal } from '@/lib/portalContainer'
import { sortByPosition } from '@/lib/positional'
import { cn } from '@/lib/utils'
import {
  BackIcon,
  CalendarIcon,
  ChangeTypeIcon,
  ClipboardIcon,
  CopyIcon,
  EyeIcon,
  EyeOffIcon,
  MoreIcon,
  TrashIcon,
} from './icons'
import { NativePopover, type Placement } from './NativePopover'
import { IconButton, Surface } from './primitives'
import { Tooltip, useTooltip } from './Tooltip'

const MenuPortalContained = containedPortal(MenuPrimitive.Portal)

/** The timed visibility of Neos.TimeableNodeVisibility. */
export const SCHEDULE_PROPERTIES = [
  'enableAfterDateTime',
  'disableAfterDateTime',
] as const

const CHANGE_TYPE_ID = 'shell-alpha-change-type'
const SCHEDULE_ID = 'shell-alpha-schedule'
const POPOVER_PLACEMENT: Placement = { side: 'top', align: 'end', offset: 8 }

type OpenPopover = 'changeType' | 'schedule' | null

/**
 * The node pill's "more" (R25): what is about the element rather than its
 * content - an info block (type, last change, id, Copy for MCP), type and
 * visibility, duplicate, copy, delete, and the node actions of plugins.
 * Change type and Schedule open their own popovers above the pill.
 */
export function ElementMenu({
  node,
  parent,
  pill,
  pillAnchor,
}: {
  node: Node
  parent: Node | null
  /** The node pill: the menu aligns with its right edge. */
  pill: React.RefObject<HTMLDivElement | null>
  /** The pill's anchor name, for the popovers. */
  pillAnchor: string
}) {
  const { nodeEdited, nodesEdited, inspectNode } = useStudio()
  const [open, setOpen] = React.useState(false)
  const moreTooltip = useTooltip(t('actions.more', 'More actions'), {
    names: true,
  })
  const [surface, setSurface] = React.useState<OpenPopover>(null)
  const [confirmDelete, setConfirmDelete] = React.useState(false)
  const { data: nodeType } = useNodeType(node.nodeType)
  const address = nodeAddressOf(node)
  const parentAddress = parent ? nodeAddressOf(parent) : null
  const tethered = node.classification === 'tethered'
  const permitted = permittedActionsOn(node)
  const schedulable =
    nodeType !== undefined &&
    SCHEDULE_PROPERTIES.some(
      (name) => nodeTypeConfiguration(nodeType).properties?.[name],
    )

  const failed = (title: string) => (error: unknown) => {
    toast.error(error, { title })
  }

  const toggleHidden = () => {
    const run = node.isHidden ? unhideNodes : hideNodes
    run([address])
      .then(() => nodeEdited(address, { reload: 'element' }))
      .catch(
        failed(
          node.isHidden
            ? t('editing.unhideFailed', 'Unhiding failed')
            : t('editing.hideFailed', 'Hiding failed'),
        ),
      )
  }

  const clipboardNode = () => ({
    address,
    nodeType: node.nodeType,
    label: node.label !== '' ? node.label : node.nodeAggregateId,
    sourceParentAddress: parentAddress,
  })

  const duplicate = () => {
    if (!parentAddress) return
    resolveSucceedingSibling(address, parentAddress)
      .then((sibling) =>
        pasteClipboardEntry(
          {
            id: 'duplicate',
            mode: 'copy',
            kind: 'content',
            nodes: [clipboardNode()],
          },
          parentAddress,
          sibling,
        ),
      )
      .then(({ affectedAddresses, newAddress }) => {
        nodesEdited(affectedAddresses)
        return fetchNode(newAddress).then(inspectNode)
      })
      .catch(
        failed(t('shellAlpha.element.duplicateFailed', 'Duplicating failed')),
      )
  }

  const remove = () =>
    deleteNodes([address])
      .then(() => {
        nodesEdited(parentAddress ? [parentAddress] : [])
        if (parentAddress)
          fetchNode(parentAddress)
            .then(inspectNode)
            .catch(() => {})
      })
      .catch(failed(t('editing.deleteFailed', 'Deleting failed')))

  return (
    <>
      {moreTooltip.tooltip}
      <MenuPrimitive.Root open={open} onOpenChange={setOpen}>
        <MenuPrimitive.Trigger
          render={
            <IconButton
              open={open || surface !== null}
              {...moreTooltip.props}
              aria-label={t('actions.more', 'More actions')}
            />
          }
        >
          <MoreIcon />
        </MenuPrimitive.Trigger>
        <MenuPortalContained>
          <MenuPrimitive.Positioner
            anchor={pill}
            side="top"
            align="end"
            sideOffset={8}
            className="z-200 outline-none"
          >
            <MenuPrimitive.Popup className="flex w-72.5 origin-(--transform-origin) flex-col rounded-shell-surface border border-shell-border-strong bg-shell-surface text-shell-text shadow-shell-surface outline-none transition-[opacity,scale] duration-150 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
              <ElementInfo node={node} />
              <div className="flex flex-col gap-px p-1.5">
                <ElementItem
                  icon={<ChangeTypeIcon />}
                  disabled={tethered || !permitted.edit}
                  onClick={() => setSurface('changeType')}
                >
                  {t('shellAlpha.element.changeType', 'Change type…')}
                </ElementItem>
                <ElementItem
                  icon={node.isHidden ? <EyeIcon /> : <EyeOffIcon />}
                  disabled={tethered || !permitted.edit}
                  onClick={toggleHidden}
                >
                  {node.isHidden
                    ? t('shellAlpha.element.show', 'Show')
                    : t('editing.hide', 'Hide')}
                </ElementItem>
                {schedulable && (
                  <ElementItem
                    icon={<CalendarIcon />}
                    hint={t(
                      'shellAlpha.element.scheduleHint',
                      'show / hide by date',
                    )}
                    disabled={!permitted.edit}
                    onClick={() => setSurface('schedule')}
                  >
                    {t('shellAlpha.element.schedule', 'Schedule…')}
                  </ElementItem>
                )}
                <ElementSeparator />
                <ElementItem
                  icon={<CopyIcon width={13} height={13} />}
                  disabled={
                    tethered ||
                    !parentAddress ||
                    !parent ||
                    !permittedActionsOn(parent).create
                  }
                  onClick={duplicate}
                >
                  {t('shellAlpha.element.duplicate', 'Duplicate')}
                </ElementItem>
                <ElementItem
                  icon={<ClipboardIcon />}
                  disabled={tethered}
                  onClick={() => {
                    clipboardAdd('copy', 'content', [clipboardNode()])
                    toast.success(
                      t('shellAlpha.element.copied', 'Copied to the clipboard'),
                    )
                  }}
                >
                  {t('shellAlpha.element.copyToClipboard', 'Copy to clipboard')}
                </ElementItem>
                <ElementSeparator />
                <ElementItem
                  icon={<TrashIcon />}
                  danger
                  disabled={tethered || !permitted.delete}
                  onClick={() => setConfirmDelete(true)}
                >
                  {t('editing.delete', 'Delete')}
                </ElementItem>
                <NodeActionMenuItems
                  node={node}
                  surface="preview"
                  onSelect={() => setOpen(false)}
                />
              </div>
            </MenuPrimitive.Popup>
          </MenuPrimitive.Positioner>
        </MenuPortalContained>
      </MenuPrimitive.Root>
      <NativePopover
        id={CHANGE_TYPE_ID}
        anchor={pillAnchor}
        placement={POPOVER_PLACEMENT}
        open={surface === 'changeType'}
        onOpenChange={(value) =>
          setSurface((current) =>
            value ? 'changeType' : current === 'changeType' ? null : current,
          )
        }
      >
        <ChangeType
          node={node}
          parent={parent}
          onBack={() => {
            setSurface(null)
            setOpen(true)
          }}
          onDone={() => setSurface(null)}
        />
      </NativePopover>
      {schedulable && nodeType && (
        <NativePopover
          id={SCHEDULE_ID}
          anchor={pillAnchor}
          placement={POPOVER_PLACEMENT}
          open={surface === 'schedule'}
          onOpenChange={(value) =>
            setSurface((current) =>
              value ? 'schedule' : current === 'schedule' ? null : current,
            )
          }
        >
          <Schedule
            node={node}
            nodeType={nodeType}
            onBack={() => {
              setSurface(null)
              setOpen(true)
            }}
          />
        </NativePopover>
      )}
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={t('editing.deleteConfirm.title', 'Delete this {0}?', [
          t('editing.entity.element', 'element'),
        ])}
        description={t(
          'shellAlpha.element.deleteBody',
          'The element and everything inside it are removed. Discarding the change in the workspace brings them back.',
        )}
        confirmLabel={t('editing.delete', 'Delete')}
        onConfirm={remove}
      />
    </>
  )
}

/** Type, last change, id and Copy for MCP. */
function ElementInfo({ node }: { node: Node }) {
  const { data: nodeTypes } = useNodeTypes()
  const { selectedDocument } = useStudio()
  const typeLabel = nodeTypes?.get(node.nodeType)?.label ?? node.nodeType
  // Who changed it is known for changes still pending in the workspace.
  const { data: pending } = useDocumentPendingEvents(
    node.workspaceName,
    selectedDocument?.nodeAggregateId ?? null,
  )
  const lastEvent = [...(pending?.events ?? [])]
    .reverse()
    .find((event) => event.nodeAggregateId === node.nodeAggregateId)
  const changedAt =
    lastEvent?.recordedAt ??
    node.timestamps.lastModified ??
    node.timestamps.originalLastModified ??
    node.timestamps.created
  const changedBy = lastEvent?.initiatingUserLabel ?? null

  const copy = (text: string, message: string) =>
    navigator.clipboard
      .writeText(text)
      .then(() => toast.success(message))
      .catch((error: unknown) => toast.error(error))

  const copyForMcp = () =>
    copy(
      [
        `Neos node "${node.label || node.nodeAggregateId}" (${node.nodeType})`,
        `nodeAggregateId: ${node.nodeAggregateId}`,
        `workspaceName: ${node.workspaceName}`,
        `dimensionSpacePoint: ${node.dimensionSpacePoint}`,
        `contentRepositoryId: ${node.contentRepositoryId}`,
      ].join('\n'),
      t('shellAlpha.copiedForMcp', 'Copied “{0}” for your assistant', [
        typeLabel,
      ]),
    )

  return (
    <div className="flex flex-col gap-2 border-b border-shell-border-strong px-3.5 pt-3.5 pb-3">
      <div className="flex min-w-0 items-center gap-2">
        <NodeTypeIcon
          nodeTypes={nodeTypes}
          nodeTypeName={node.nodeType}
          className="type-icon-s text-shell-text"
        />
        <span className="truncate text-[0.8125rem] leading-4 font-semibold">
          {typeLabel}
        </span>
      </div>
      <span className="type-shell-secondary text-shell-subtle">
        {changedBy
          ? t('shellAlpha.element.changedBy', 'Changed by {0} · {1}', [
              changedBy,
              relativeTime(changedAt),
            ])
          : t('shellAlpha.element.changed', 'Changed {0}', [
              relativeTime(changedAt),
            ])}
      </span>
      <div className="flex items-center gap-1.5">
        <Tooltip label={t('shellAlpha.element.copyId', 'Copy the node ID')}>
          <button
            type="button"
            onClick={() =>
              void copy(
                node.nodeAggregateId,
                t('shellAlpha.element.idCopied', 'Copied the node ID'),
              )
            }
            className="flex h-6 min-w-0 cursor-pointer items-center gap-1.5 rounded-shell-control bg-shell-input pr-1.5 pl-2 text-shell-muted outline-none hover:text-shell-text focus-visible:ring-2 focus-visible:ring-shell-accent/60"
          >
            <span className="max-w-26 truncate font-mono text-[0.6875rem] leading-3.5">
              {node.nodeAggregateId}
            </span>
            <CopyIcon width={11} height={11} strokeWidth={1.2} />
          </button>
        </Tooltip>
        <button
          type="button"
          onClick={() => void copyForMcp()}
          className="flex h-6 shrink-0 cursor-pointer items-center rounded-shell-control bg-shell-ground px-2 text-[0.6875rem] leading-3.5 text-shell-text outline-none hover:bg-shell-hover focus-visible:ring-2 focus-visible:ring-shell-accent/60"
        >
          {t('shellAlpha.copyForMcp', 'Copy for MCP')}
        </button>
      </div>
    </div>
  )
}

function ElementItem({
  icon,
  hint,
  danger = false,
  disabled,
  onClick,
  children,
}: {
  icon: React.ReactNode
  hint?: string
  danger?: boolean
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <MenuPrimitive.Item
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex h-8.5 shrink-0 cursor-default items-center gap-2.5 rounded-shell-control px-2.5 type-shell-control outline-none select-none data-disabled:opacity-40 data-highlighted:bg-shell-ground',
        danger ? 'text-shell-danger-text' : 'text-shell-text',
      )}
    >
      <span
        className={cn(
          'flex w-4 shrink-0 justify-center',
          danger ? 'text-shell-danger-text' : 'text-shell-quiet',
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {hint && (
        <span className="shrink-0 type-shell-secondary text-shell-disabled">
          {hint}
        </span>
      )}
    </MenuPrimitive.Item>
  )
}

function ElementSeparator() {
  return (
    <div
      role="separator"
      className="mx-1.5 my-1 h-px shrink-0 bg-shell-border-strong"
    />
  )
}

function PopoverHeader({
  title,
  onBack,
}: {
  title: string
  onBack: () => void
}) {
  return (
    <div className="flex h-11.5 shrink-0 items-center gap-2 border-b border-shell-border-strong pr-3.5 pl-2">
      <button
        type="button"
        onClick={onBack}
        aria-label={t('shellAlpha.back', 'Back')}
        className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-shell-control text-shell-quiet outline-none hover:bg-shell-hover focus-visible:ring-2 focus-visible:ring-shell-accent/60"
      >
        <BackIcon />
      </button>
      <span className="truncate text-[0.8125rem] leading-4 font-semibold text-shell-text">
        {title}
      </span>
    </div>
  )
}

const typeLabelOf = (nodeType: NodeType): string =>
  humanizeLabel(
    configuredLabel(nodeType),
    nodeType.name.split(':').pop() ?? nodeType.name,
  )

/** The properties a type shows to editors, by name, with their labels. */
function editableProperties(nodeType: NodeType): Map<string, string> {
  const properties = nodeTypeConfiguration(nodeType).properties ?? {}
  return new Map(
    Object.entries(properties).flatMap(([name, property]) =>
      property &&
      !name.startsWith('_') &&
      (property.ui?.inspector || property.ui?.inlineEditable)
        ? [[name, humanizeLabel(property.ui?.label, name)] as const]
        : [],
    ),
  )
}

/**
 * The Add menu's type picker in "Change to" mode: the types the node type
 * editor offers at the node's position, without the current one. Picking one
 * asks in the footer what carries over.
 */
function ChangeType({
  node,
  parent,
  onBack,
  onDone,
}: {
  node: Node
  parent: Node | null
  onBack: () => void
  onDone: () => void
}) {
  const { data: nodeTypes } = useNodeTypes()
  const { data: groupList } = useNodeTypeGroups()
  const { nodeEdited, inspectNode } = useStudio()
  const { data: allowed } = useAllowedChildNodeTypes(
    parent ? nodeAddressOf(parent) : null,
  )
  const [picked, setPicked] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)

  const candidates = React.useMemo(() => {
    if (!nodeTypes || !allowed) return null
    const groupOrder = sortByPosition(
      (groupList ?? []).map((group) => ({
        key: group.name,
        position: group.position,
      })),
    )
    const types = allowed
      .filter((name) => name !== node.nodeType)
      .map((name) => nodeTypes.get(name))
      .filter(
        (nodeType): nodeType is NodeType =>
          nodeType !== undefined && !nodeType.isAbstract,
      )
    const rank = (nodeType: NodeType) => {
      const index = groupOrder.indexOf(nodeType.group ?? '')
      return index === -1 ? groupOrder.length : index
    }
    const byGroup = [...new Set(types.map(rank))].sort((a, b) => a - b)
    return byGroup.flatMap((group) =>
      sortByPosition(
        types
          .filter((nodeType) => rank(nodeType) === group)
          .map((nodeType) => ({
            key: nodeType.name,
            position: nodeType.position,
          })),
      ).map((name) => nodeTypes.get(name)!),
    )
  }, [nodeTypes, groupList, allowed, node.nodeType])

  const current = nodeTypes?.get(node.nodeType)
  const target = picked ? nodeTypes?.get(picked) : undefined
  // The list carries no configuration: the properties come with each type.
  const { data: currentConfigured } = useNodeType(node.nodeType)
  const { data: targetConfigured } = useNodeType(picked)
  const consequence = React.useMemo(() => {
    if (!currentConfigured || !targetConfigured) return ''
    const before = editableProperties(currentConfigured)
    const after = editableProperties(targetConfigured)
    const hasValue = (name: string) => {
      const value = node.properties[name]
      return value !== undefined && value !== null && value !== ''
    }
    const list = (labels: string[]) =>
      new Intl.ListFormat(document.documentElement.lang || 'en', {
        type: 'conjunction',
      }).format(labels)
    const kept = [...before.keys()].filter(
      (name) => after.has(name) && hasValue(name),
    )
    const removed = [...before.keys()].filter((name) => !after.has(name))
    const sentences = []
    if (kept.length > 0)
      sentences.push(
        kept.length === 1
          ? t('shellAlpha.changeType.keepsOne', '{0} carries over.', [
              list(kept.map((name) => before.get(name)!)),
            ])
          : t('shellAlpha.changeType.keepsMany', '{0} carry over.', [
              list(kept.map((name) => before.get(name)!)),
            ]),
      )
    if (removed.length > 0)
      sentences.push(
        removed.length === 1
          ? t('shellAlpha.changeType.removesOne', '{0} is removed.', [
              list(removed.map((name) => before.get(name)!)),
            ])
          : t('shellAlpha.changeType.removesMany', '{0} are removed.', [
              list(removed.map((name) => before.get(name)!)),
            ]),
      )
    return sentences.join(' ')
  }, [currentConfigured, targetConfigured, node.properties])

  const apply = () => {
    if (!picked) return
    const address = nodeAddressOf(node)
    setBusy(true)
    changeNodeType(address, picked)
      .then(() => {
        nodeEdited(address, { reload: 'page' })
        onDone()
        return fetchNode(address).then(inspectNode)
      })
      .catch((error: unknown) =>
        toast.error(error, {
          title: t('shellAlpha.changeType.failed', 'Changing the type failed'),
        }),
      )
      .finally(() => setBusy(false))
  }

  return (
    <Surface className="flex max-h-[min(32rem,calc(100svh-12rem))] w-100 flex-col overflow-hidden">
      <PopoverHeader
        title={t('shellAlpha.changeType.title', 'Change {0} to…', [
          current ? typeLabelOf(current) : node.nodeType,
        ])}
        onBack={onBack}
      />
      <div className="flex min-h-0 flex-wrap gap-1.5 overflow-y-auto p-3">
        {candidates === null ? (
          <p className="type-shell-secondary text-shell-muted">
            {t('shellAlpha.addLoading', 'Loading…')}
          </p>
        ) : candidates.length === 0 ? (
          <p className="type-shell-secondary text-shell-muted">
            {t('shellAlpha.changeType.none', 'No other type is allowed here.')}
          </p>
        ) : (
          candidates.map((nodeType) => (
            <button
              key={nodeType.name}
              type="button"
              aria-pressed={picked === nodeType.name}
              onClick={() => setPicked(nodeType.name)}
              className={cn(
                'flex h-15.5 w-30 shrink-0 cursor-pointer flex-col items-center justify-center gap-1.25 rounded-shell-control bg-shell-tile px-2 text-shell-text outline-none hover:bg-shell-ground focus-visible:ring-2 focus-visible:ring-shell-accent/60',
                picked === nodeType.name &&
                  'shadow-[inset_0_0_0_1.5px_var(--color-shell-accent)]',
              )}
            >
              <NodeTypeIcon
                nodeTypes={nodeTypes}
                nodeTypeName={nodeType.name}
                className="type-icon-s"
              />
              <span className="max-w-full truncate type-shell-secondary">
                {typeLabelOf(nodeType)}
              </span>
            </button>
          ))
        )}
      </div>
      {target && (
        <div className="flex shrink-0 flex-col gap-2.5 border-t border-shell-border-strong py-3 pr-3 pl-4">
          <p className="text-[0.8125rem] leading-4.75 text-shell-text">
            {t('shellAlpha.changeType.question', 'Change to {0}?', [
              typeLabelOf(target),
            ])}
            {consequence && (
              <span className="text-shell-muted"> {consequence}</span>
            )}
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => setPicked(null)}
              className="flex h-8 cursor-pointer items-center rounded-shell-control bg-shell-ground px-3.5 type-shell-control text-shell-text outline-none hover:bg-shell-hover focus-visible:ring-2 focus-visible:ring-shell-accent/60 disabled:opacity-50"
            >
              {t('action.cancel', 'Cancel')}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={apply}
              className="flex h-8 cursor-pointer items-center rounded-shell-control bg-shell-accent px-3.5 type-shell-control font-semibold text-white outline-none hover:brightness-110 focus-visible:ring-2 focus-visible:ring-white/60 disabled:opacity-50"
            >
              {t('shellAlpha.changeType.apply', 'Change type')}
            </button>
          </div>
        </div>
      )}
    </Surface>
  )
}

/** Show from / Hide after: the timed visibility, in the popover style. */
function Schedule({
  node,
  nodeType,
  onBack,
}: {
  node: Node
  nodeType: NodeType
  onBack: () => void
}) {
  const { nodeEdited } = useStudio()
  const properties = React.useMemo(() => {
    const all = buildInspectorSchema(nodeType)
      .flatMap((tab) => tab.groups)
      .flatMap((group) => group.items)
      .flatMap((item) => (item.kind === 'property' ? [item.property] : []))
    const labels: Record<string, string> = {
      enableAfterDateTime: t('shellAlpha.schedule.showFrom', 'Show from'),
      disableAfterDateTime: t('shellAlpha.schedule.hideAfter', 'Hide after'),
    }
    return SCHEDULE_PROPERTIES.flatMap((name) => {
      const property = all.find((candidate) => candidate.name === name)
      return property ? [{ ...property, label: labels[name]! }] : []
    })
  }, [nodeType])

  const save = (property: InspectorProperty, value: unknown) => {
    const address = nodeAddressOf(node)
    persistPropertyChange(address, property.name, value)
      .then(() =>
        nodeEdited(address, {
          reload: property.reload === 'none' ? 'element' : property.reload,
          kind: 'properties',
        }),
      )
      .catch((error: unknown) =>
        toast.error(error, {
          title: t('inspector.savingFailed', 'Saving failed'),
        }),
      )
  }

  return (
    <Surface className="flex w-80 flex-col">
      <PopoverHeader
        title={t('shellAlpha.schedule.title', 'Schedule')}
        onBack={onBack}
      />
      <div className="flex flex-col gap-3.5 px-4 pt-3.5 pb-4 type-body">
        {properties.map((property) => (
          <PropertyEditor
            key={`${node.nodeAggregateId}:${property.name}`}
            property={property}
            value={node.properties[property.name]}
            nodeAddress={node}
            onSave={(_, value) => save(property, value)}
          />
        ))}
        <p className="type-shell-secondary text-shell-subtle">
          {t(
            'shellAlpha.schedule.hint',
            'The element shows and hides itself at these times, also in Live once published.',
          )}
        </p>
      </div>
    </Surface>
  )
}
