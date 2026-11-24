import * as React from 'react'
import {
  countChangedNodes,
  useWorkspaceChanges,
} from '@/api/neos/endpoints/workspaces'
import type { Workspace } from '@/api/neos/schema'
import { useStudio, useStudioActions } from '@/app/StudioContext'
import { useKeyboardShortcut } from '@/features/shortcuts/useKeyboardShortcut'
import { workspaceLabel } from '@/features/workspaces/changeDisplay'
import { ConflictResolutionDialog } from '@/features/workspaces/ConflictResolutionDialog'
import {
  useWorkspaceDocumentChanges,
  type WorkspaceDocumentChange,
} from '@/features/workspaces/historyData'
import {
  useCanPublish,
  useWorkspacePublishing,
} from '@/features/workspaces/useWorkspacePublishing'
import { celebrateAround } from '@/lib/confetti'
import { translate as t } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { NativePopover, type Placement } from './NativePopover'
import { Tooltip } from './Tooltip'
import { CheckboxBox, Surface } from './primitives'

const PUBLISH_ID = 'shell-alpha-publish'
const PLACEMENT: Placement = { side: 'bottom', align: 'end', offset: 8 }

/**
 * The workspace pill's trailing segment: the pending count and Publish, or
 * "Up to date". It opens the publish popover under the pill; a conflict
 * while publishing opens the conflict dialog and turns the pill orange.
 */
export function PublishSegment({
  workspaces,
  activeWorkspace,
  anchor,
  onConflictChange,
  onOpenWorkspaces,
}: {
  workspaces: Workspace[]
  activeWorkspace: Workspace
  /** The workspace pill the popover aligns with. */
  anchor: string
  onConflictChange: (conflict: boolean) => void
  /** Opens the Workspaces mode, where every other pair is reviewed. */
  onOpenWorkspaces: () => void
}) {
  const [open, setOpen] = React.useState(false)
  const { data: changesResponse } = useWorkspaceChanges(activeWorkspace.name)
  const { site } = useStudio()
  const { navigateToNode } = useStudioActions()
  const siteId = site?.nodeAggregateId ?? null
  const allChanges = changesResponse?.changes ?? []
  const changeCount = countChangedNodes(
    siteId
      ? allChanges.filter(
          (c) => c.siteAggregateId === siteId || c.siteAggregateId === null,
        )
      : allChanges,
  )
  const publishing = useWorkspacePublishing(activeWorkspace.name)
  const { pendingConflict, setPendingConflict, resolve } = publishing
  const conflict = pendingConflict !== null
  React.useEffect(
    () => onConflictChange(conflict),
    [conflict, onConflictChange],
  )
  // The conflict dialog blocks; the popover would stay above it.
  if (conflict && open) setOpen(false)

  useKeyboardShortcut({
    id: 'workspace.publish',
    key: 'p',
    title: t('workspace.reviewAndPublish', 'Review and publish'),
    category: t('shortcuts.category.workspace', 'Workspace'),
    handler: () => {
      if (open) return false
      setOpen(true)
    },
  })

  const target = workspaces.find(
    (workspace) => workspace.name === activeWorkspace.baseWorkspaceName,
  )
  const targetLabel = workspaceLabel(
    target,
    activeWorkspace.baseWorkspaceName ?? '',
  )

  return (
    <>
      <button
        type="button"
        popoverTarget={PUBLISH_ID}
        aria-expanded={open}
        data-open={open || undefined}
        className={cn(
          'group flex h-6.5 cursor-pointer items-center rounded-full type-shell-control outline-none focus-visible:ring-2 focus-visible:ring-shell-accent/60',
          conflict
            ? 'gap-1.75 bg-shell-conflict/20 pr-3 pl-1.5 font-semibold text-shell-conflict hover:bg-shell-conflict/30'
            : changeCount > 0
              ? 'gap-1.75 bg-shell-accent-tint pr-3 pl-1.5 font-semibold text-shell-accent-pale hover:bg-shell-accent-tint-strong data-open:bg-shell-accent-tint-strong'
              : 'px-2.5 text-[#5a5a5a] hover:text-shell-muted data-open:text-shell-muted',
        )}
      >
        {changeCount > 0 || conflict ? (
          <>
            <span
              className={cn(
                'flex h-4.5 min-w-4.5 items-center justify-center rounded-full px-1.25 text-[0.6875rem] leading-3.5 font-bold text-white',
                conflict ? 'bg-shell-conflict' : 'bg-shell-accent',
              )}
              aria-label={t('workspace.pendingBadge', '{0} pending changes', [
                changeCount,
              ])}
            >
              {changeCount}
            </span>
            {t('shellAlpha.publish.button', 'Publish')}
          </>
        ) : (
          t('workspace.upToDate', 'Up to date')
        )}
      </button>
      <NativePopover
        id={PUBLISH_ID}
        anchor={anchor}
        placement={PLACEMENT}
        open={open}
        onOpenChange={setOpen}
      >
        <PublishPopover
          workspace={activeWorkspace}
          workspaces={workspaces}
          targetLabel={targetLabel}
          publishing={publishing}
          onClose={() => setOpen(false)}
          onOpenWorkspaces={() => {
            setOpen(false)
            onOpenWorkspaces()
          }}
        />
      </NativePopover>
      <ConflictResolutionDialog
        open={conflict}
        workspaceName={activeWorkspace.name}
        targetLabel={targetLabel}
        conflicts={pendingConflict?.conflicts.conflicts ?? []}
        partial={pendingConflict?.conflicts.title === 'partial'}
        busy={resolve.isPending}
        onCancel={() => setPendingConflict(null)}
        onForce={() => resolve.mutate('force')}
        onDiscardAll={() => resolve.mutate('discardAll')}
        onNavigate={(address) => {
          setPendingConflict(null)
          navigateToNode(address)
        }}
      />
    </>
  )
}

function PublishPopover({
  workspace,
  workspaces,
  targetLabel,
  publishing,
  onClose,
  onOpenWorkspaces,
}: {
  workspace: Workspace
  workspaces: Workspace[]
  targetLabel: string
  publishing: ReturnType<typeof useWorkspacePublishing>
  onClose: () => void
  onOpenWorkspaces: () => void
}) {
  const { site, selectedDocument } = useStudio()
  const { navigateToNode } = useStudioActions()
  const { data, error, isLoading } = useWorkspaceDocumentChanges(
    workspace.name,
    site?.nodeAggregateId ?? null,
  )
  const documents = React.useMemo(() => data?.documents ?? [], [data])
  // Everything starts checked; what the editor unchecks is remembered.
  const [unchecked, setUnchecked] = React.useState<ReadonlySet<string>>(
    () => new Set(),
  )
  const [confirming, setConfirming] = React.useState(false)
  const publishRef = React.useRef<HTMLButtonElement>(null)
  const canPublish = useCanPublish(workspace, workspaces)
  const canDiscard = workspace.permissions.write
  const { operation } = publishing
  const busy = operation.isPending

  const selected = documents.filter(
    (document) => !unchecked.has(document.documentAggregateId),
  )
  const sum = (list: WorkspaceDocumentChange[]) =>
    list.reduce((total, document) => total + document.changeCount, 0)
  const selectedChanges = sum(selected)
  const sourceLabel =
    workspace.classification === 'personal'
      ? t('workspace.myWorkspace', 'My workspace')
      : workspaceLabel(workspace, workspace.name)

  const run = (kind: 'publish' | 'discard') => {
    const ids = selected.map((document) => document.documentAggregateId)
    if (ids.length === 0) return
    operation.mutate(
      { kind, scope: { documentAggregateIds: ids } },
      {
        onSuccess: () => {
          if (kind === 'publish') celebrateAround(publishRef.current)
          onClose()
        },
      },
    )
  }

  if (isLoading || (error && !data)) {
    return (
      <Surface className="w-95 p-4 type-shell-secondary text-shell-muted">
        {isLoading
          ? t('workspace.review.loading', 'Loading changes…')
          : t(
              'workspace.review.loadFailed',
              'The changes could not be loaded.',
            )}
      </Surface>
    )
  }

  if (documents.length === 0) {
    return (
      <Surface className="flex w-95 flex-col">
        <div className="flex items-start gap-3 p-4">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-shell-ground text-shell-text">
            <svg
              width="12"
              height="10"
              viewBox="0 0 12 10"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.7}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M1 5.2l3.2 3.2L11 1.5" />
            </svg>
          </span>
          <div className="flex flex-col gap-0.5">
            <span className="text-[0.8125rem] leading-4.5 font-semibold text-shell-text">
              {t('workspace.upToDate', 'Up to date')}
            </span>
            <span className="type-shell-secondary text-shell-subtle">
              {t('shellAlpha.publish.nothing', 'Nothing to publish from {0}.', [
                sourceLabel,
              ])}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onOpenWorkspaces}
          className="flex h-11 shrink-0 cursor-pointer items-center justify-between rounded-b-shell-surface border-t border-shell-border-strong px-4 type-shell-secondary text-shell-quiet outline-none hover:bg-shell-hover-inset hover:text-shell-text focus-visible:bg-shell-hover-inset"
        >
          {t('shellAlpha.publish.otherWorkspaces', 'Review other workspaces')}
          <svg
            width="10"
            height="9"
            viewBox="0 0 10 9"
            fill="none"
            stroke="var(--color-shell-muted)"
            strokeWidth={1.5}
            aria-hidden
          >
            <path d="M0 4.5h8.5M5 1l3.5 3.5L5 8" />
          </svg>
        </button>
      </Surface>
    )
  }

  const changesText = (count: number) =>
    count === 1
      ? t('shellAlpha.publish.oneChange', '1 change')
      : t('shellAlpha.publish.changes', '{0} changes', [count])
  const pagesText =
    documents.length === 1
      ? t('shellAlpha.publish.onePage', '1 page')
      : t('shellAlpha.publish.pages', '{0} pages', [documents.length])

  return (
    <Surface className="flex w-95 flex-col">
      <div className="flex flex-col gap-0.5 px-4 pt-3.5 pb-2.5">
        <span className="text-[0.8125rem] leading-4.5 font-semibold text-shell-text">
          {t('shellAlpha.publish.title', 'Publish to {0}', [targetLabel])}
        </span>
        <span className="type-shell-secondary text-shell-subtle">
          {t('shellAlpha.publish.summary', '{0} on {1}, from {2}', [
            changesText(sum(documents)),
            pagesText,
            sourceLabel,
          ])}
        </span>
      </div>
      <ul className="flex max-h-[min(24rem,calc(100svh-14rem))] flex-col gap-0.5 overflow-y-auto px-1.5 pb-2">
        {documents.map((document) => {
          const id = document.documentAggregateId
          const checked = !unchecked.has(id)
          const parent =
            id === selectedDocument?.nodeAggregateId
              ? t('shellAlpha.publish.thisPage', 'This page')
              : (document.breadcrumb.at(-2) ?? '')
          return (
            <li
              key={id}
              className="group/row flex h-12 shrink-0 items-center gap-2.5 rounded-shell-control pr-1.5 pl-2.5 hover:bg-shell-tile"
            >
              <button
                type="button"
                role="checkbox"
                aria-checked={checked}
                aria-label={document.label}
                disabled={busy || confirming}
                onClick={() =>
                  setUnchecked((current) => {
                    const next = new Set(current)
                    if (checked) next.add(id)
                    else next.delete(id)
                    return next
                  })
                }
                className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 text-left outline-none"
              >
                <CheckboxBox checked={checked} />
                <span className="flex min-w-0 flex-1 flex-col gap-px">
                  <span className="truncate text-[0.8125rem] leading-4.25 text-shell-text">
                    {document.label}
                  </span>
                  {parent && (
                    <span className="truncate type-shell-secondary text-shell-subtle">
                      {parent}
                    </span>
                  )}
                </span>
              </button>
              <span className="shrink-0 pr-1 type-shell-secondary text-shell-subtle group-focus-within/row:hidden group-hover/row:hidden">
                {changeSummary(document)}
              </span>
              {document.documentAddress && (
                <button
                  type="button"
                  onClick={() => {
                    onClose()
                    navigateToNode(document.documentAddress!)
                  }}
                  className="hidden h-7 shrink-0 cursor-pointer items-center rounded-shell-control bg-shell-raised px-2.5 type-shell-secondary text-shell-text outline-none group-focus-within/row:flex group-hover/row:flex hover:bg-shell-active focus-visible:ring-2 focus-visible:ring-shell-accent/60"
                >
                  {t('shellAlpha.publish.show', 'Show')}
                </button>
              )}
            </li>
          )
        })}
      </ul>
      {confirming ? (
        <div className="flex flex-col gap-2.5 border-t border-shell-border-strong pt-3 pr-2.5 pb-2.5 pl-4">
          <p className="text-[0.8125rem] leading-4.5 text-shell-text">
            {t('shellAlpha.publish.discardQuestion', 'Discard {0}?', [
              changesText(selectedChanges),
            ])}{' '}
            <span className="text-shell-muted">
              {t('shellAlpha.publish.cannotUndo', 'This can’t be undone.')}
            </span>
          </p>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirming(false)}
              className={secondaryButton}
            >
              {t('action.cancel', 'Cancel')}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => run('discard')}
              className={dangerButton}
            >
              {t('shellAlpha.publish.discardChanges', 'Discard {0}', [
                changesText(selectedChanges),
              ])}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between border-t border-shell-border-strong py-2.5 pr-2.5 pl-3">
          <Tooltip
            label={
              canDiscard
                ? undefined
                : t(
                    'workspace.review.noWriteAccess',
                    'You are not allowed to change "{0}"',
                    [sourceLabel],
                  )
            }
          >
            <button
              type="button"
              disabled={busy || !canDiscard || selected.length === 0}
              onClick={() => setConfirming(true)}
              className="flex h-8 cursor-pointer items-center rounded-shell-control px-2.5 type-shell-control text-shell-quiet outline-none hover:bg-shell-hover-inset hover:text-shell-text focus-visible:ring-2 focus-visible:ring-shell-accent/60 disabled:cursor-default disabled:text-shell-disabled disabled:hover:bg-transparent"
            >
              {t('workspace.discard.button', 'Discard')}
            </button>
          </Tooltip>
          <Tooltip
            label={
              canPublish
                ? undefined
                : t(
                    'workspace.publishDenied',
                    'You are not allowed to publish to "{0}"',
                    [targetLabel],
                  )
            }
          >
            <button
              ref={publishRef}
              type="button"
              disabled={busy || !canPublish || selected.length === 0}
              onClick={() => run('publish')}
              className="flex h-8 cursor-pointer items-center rounded-shell-control bg-shell-accent px-3.5 type-shell-control font-semibold text-white outline-none transition-[filter] hover:brightness-110 focus-visible:ring-2 focus-visible:ring-white/60 disabled:cursor-default disabled:opacity-50 disabled:hover:brightness-100"
            >
              {t('shellAlpha.publish.publishChanges', 'Publish {0}', [
                changesText(selectedChanges),
              ])}
            </button>
          </Tooltip>
        </div>
      )}
    </Surface>
  )
}

const secondaryButton =
  'flex h-8 cursor-pointer items-center rounded-shell-control bg-shell-ground px-3.5 type-shell-control text-shell-text outline-none hover:bg-shell-hover focus-visible:ring-2 focus-visible:ring-shell-accent/60 disabled:cursor-default disabled:opacity-50'
const dangerButton =
  'flex h-8 cursor-pointer items-center rounded-shell-control bg-shell-danger px-3.5 type-shell-control font-semibold text-white outline-none transition-[filter] hover:brightness-110 focus-visible:ring-2 focus-visible:ring-white/60 disabled:cursor-default disabled:opacity-50'

/** What changed on the page, in a word: "1 changed", "1 new". */
function changeSummary(document: WorkspaceDocumentChange): string {
  const count = document.changeCount
  if (document.deleted)
    return t('shellAlpha.publish.removed', '{0} removed', [count])
  if (document.created) return t('shellAlpha.publish.new', '{0} new', [count])
  if (document.moved && !document.changed)
    return t('shellAlpha.publish.moved', '{0} moved', [count])
  return t('shellAlpha.publish.changed', '{0} changed', [count])
}
