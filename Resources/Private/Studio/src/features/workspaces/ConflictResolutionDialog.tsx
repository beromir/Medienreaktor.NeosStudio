import { useMemo } from 'react'
import type { ConflictingChange, NodeAddress } from '@/api/neos/schema'
import { translate as t } from '@/lib/i18n'
import { useLayoutMode } from '@/lib/layoutMode'
import { useConflictDetails } from './historyData'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type ChangeKind = 'created' | 'changed' | 'moved' | 'deleted'

/** Icon + past-tense verb per type of change, mirroring the change badges. */
const TYPE_META: Record<
  ChangeKind,
  { icon: string; verbKey: string; verb: string }
> = {
  created: {
    icon: 'fa-plus',
    verbKey: 'workspace.change.added',
    verb: 'added',
  },
  changed: {
    icon: 'fa-pen',
    verbKey: 'workspace.change.changed',
    verb: 'changed',
  },
  moved: {
    icon: 'fa-arrows-up-down-left-right',
    verbKey: 'workspace.change.moved',
    verb: 'moved',
  },
  deleted: {
    icon: 'fa-trash-can',
    verbKey: 'workspace.change.removed',
    verb: 'removed',
  },
}

/** Neos.Api's typeOfChange ("node_has_been_changed") as a change kind. */
function changeKind(typeOfChange: string | null): ChangeKind | null {
  const kind = (typeOfChange ?? '').replace(/^node_has_been_/, '')
  return kind === 'created' ||
    kind === 'changed' ||
    kind === 'moved' ||
    kind === 'deleted'
    ? kind
    : null
}

/** A conflicting change with the labels and document the Studio resolved for it. */
interface ResolvedConflict extends ConflictingChange {
  nodeLabel: string | null
  documentLabel: string | null
  documentAddress: NodeAddress | null
}

/**
 * The conflicts with their labels and document addresses filled in - Neos.Api
 * names conflicting nodes by id only; the Studio resolves them in the
 * workspace (useConflictDetails). Until that answer arrives (or when it
 * fails) the conflicts come back without them.
 */
function useResolvedConflicts(
  workspaceName: string | null,
  conflicts: ConflictingChange[],
): ResolvedConflict[] {
  const { data: details } = useConflictDetails(
    workspaceName,
    conflicts.flatMap((conflict) =>
      conflict.nodeAggregateId !== null
        ? [
            {
              nodeAggregateId: conflict.nodeAggregateId,
              documentAggregateId: conflict.documentAggregateId,
            },
          ]
        : [],
    ),
  )
  return useMemo(() => {
    const byId = new Map(
      (details ?? []).map((detail) => [detail.nodeAggregateId, detail]),
    )
    return conflicts.map((conflict) => {
      const detail =
        conflict.nodeAggregateId !== null
          ? byId.get(conflict.nodeAggregateId)
          : undefined
      return {
        ...conflict,
        documentAggregateId:
          conflict.documentAggregateId ?? detail?.documentAggregateId ?? null,
        nodeLabel: detail?.nodeLabel ?? null,
        documentLabel: detail?.documentLabel ?? null,
        documentAddress: detail?.documentAddress ?? null,
      }
    })
  }, [conflicts, details])
}

function reasonText(conflict: ConflictingChange): string {
  if (conflict.reason === 'node_has_been_deleted') {
    return t(
      'workspace.conflict.nodeDeleted',
      'It was deleted in the target workspace since you changed it.',
    )
  }
  return conflict.message
}

/**
 * Presents the conflicts a rebase/publish surfaced and offers the resolutions
 * the content repository actually supports. Purely presentational - the parent
 * wires the actions to its context (sync vs publish) and closes on success.
 *
 * - "Discard conflicting changes" forces the rebase, dropping the listed
 *   changes and keeping the rest (not offered for `partial` conflicts, where
 *   forcing does not help - there the selection itself is the problem).
 * - "Discard all changes" throws the whole set away - the escape hatch.
 */
export function ConflictResolutionDialog({
  open,
  workspaceName,
  conflicts: reportedConflicts,
  partial,
  busy,
  onCancel,
  onForce,
  onDiscardAll,
  onNavigate,
  targetLabel,
}: {
  open: boolean
  /**
   * The workspace the conflicts belong to - its nodes are looked up to name
   * the conflicts (Neos.Api reports them by id only).
   */
  workspaceName: string | null
  /** Neos.Api's conflicting changes (WorkspaceConflictProblem.conflicts). */
  conflicts: ConflictingChange[]
  /** True for a "partial" conflict problem, where forcing is not a valid remedy. */
  partial: boolean
  busy: boolean
  onCancel: () => void
  onForce?: () => void
  onDiscardAll?: () => void
  onNavigate?: (documentAddress: NodeAddress) => void
  /** The workspace the changes conflict with, named in the alpha layout's title. */
  targetLabel?: string
}) {
  const conflicts = useResolvedConflicts(
    open ? workspaceName : null,
    reportedConflicts,
  )
  const alpha = useLayoutMode() === 'alpha'
  if (alpha) {
    const title =
      conflicts.length === 1
        ? t('workspace.conflict.alphaTitleOne', '1 change conflicts with {0}', [
            targetLabel ?? t('workspace.live', 'Live'),
          ])
        : t(
            'workspace.conflict.alphaTitleMany',
            '{0} changes conflict with {1}',
            [conflicts.length, targetLabel ?? t('workspace.live', 'Live')],
          )
    return (
      <Dialog open={open} onOpenChange={(next) => !next && !busy && onCancel()}>
        <DialogContent showCloseButton={false} className="max-w-130">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              {partial
                ? t(
                    'workspace.conflict.partialDescription',
                    'These changes can’t be published on their own - they depend on other pending changes. Publish everything instead, or discard them.',
                  )
                : t(
                    'workspace.conflict.alphaDescription',
                    'Someone published a change to the same element while you were editing. Discard your version to publish the rest, or cancel and look at it first.',
                  )}
            </DialogDescription>
          </DialogHeader>
          <ul className="flex max-h-60 flex-col gap-1 overflow-y-auto">
            {conflicts.map((conflict, index) => {
              const kind = changeKind(conflict.typeOfChange)
              const meta = kind ? TYPE_META[kind] : undefined
              const canNavigate =
                onNavigate !== undefined &&
                conflict.documentAddress !== null &&
                conflict.documentLabel !== null
              return (
                <li
                  key={conflict.nodeAggregateId ?? index}
                  className="flex items-start gap-3 rounded-shell-control bg-shell-row px-3.5 py-3"
                >
                  <span className="flex h-4.5 w-4 shrink-0 items-center justify-center text-shell-muted">
                    <i
                      className={`fas ${meta?.icon ?? 'fa-circle-exclamation'} text-[0.6875rem]`}
                      aria-hidden
                    />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.75">
                    <span className="text-[0.8125rem] leading-4.5 break-words text-shell-text">
                      {conflict.nodeLabel ??
                        conflict.documentLabel ??
                        conflict.nodeAggregateId ??
                        t('workspace.conflict.unknownNode', 'Unknown node')}
                      {meta && (
                        <span className="text-shell-subtle">
                          {' · '}
                          {t(meta.verbKey, meta.verb)}
                        </span>
                      )}
                    </span>
                    <span className="type-shell-secondary text-shell-subtle">
                      {reasonText(conflict)}
                    </span>
                    {canNavigate && (
                      <button
                        type="button"
                        className="cursor-pointer self-start type-shell-secondary text-shell-accent-light outline-none hover:underline focus-visible:underline"
                        onClick={() => onNavigate(conflict.documentAddress!)}
                      >
                        {t('workspace.conflict.showOn', 'Show on {0}', [
                          conflict.documentLabel!,
                        ])}
                      </button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
          <DialogFooter className="sm:justify-between">
            {!partial && onDiscardAll ? (
              <Button variant="ghost" onClick={onDiscardAll} disabled={busy}>
                {t(
                  'workspace.conflict.discardAllChanges',
                  'Discard all changes',
                )}
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button variant="secondary" onClick={onCancel} disabled={busy}>
                {t('action.cancel', 'Cancel')}
              </Button>
              {partial
                ? onDiscardAll && (
                    <Button
                      variant="destructive"
                      onClick={onDiscardAll}
                      disabled={busy}
                    >
                      {t(
                        'workspace.conflict.discardAllChanges',
                        'Discard all changes',
                      )}
                    </Button>
                  )
                : onForce && (
                    <Button
                      variant="destructive"
                      onClick={onForce}
                      disabled={busy}
                    >
                      {t(
                        'workspace.conflict.discardMyVersion',
                        'Discard my version',
                      )}
                    </Button>
                  )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !busy && onCancel()}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>
            {conflicts.length === 1
              ? t('workspace.conflict.countOne', '1 conflicting change')
              : t('workspace.conflict.countMany', '{0} conflicting changes', [
                  conflicts.length,
                ])}
          </DialogTitle>
          <DialogDescription>
            {partial
              ? t(
                  'workspace.conflict.partialDescription',
                  'These changes can’t be published on their own - they depend on other pending changes. Publish everything instead, or discard them.',
                )
              : t(
                  'workspace.conflict.description',
                  'These pending changes conflict with changes already published to the base workspace. Discarding them keeps all your other changes; discarded changes cannot be recovered.',
                )}
          </DialogDescription>
        </DialogHeader>

        <ul className="flex max-h-60 flex-col gap-px overflow-y-auto">
          {conflicts.map((conflict, index) => {
            const kind = changeKind(conflict.typeOfChange)
            const meta = kind ? TYPE_META[kind] : undefined
            const title =
              conflict.nodeLabel ??
              conflict.documentLabel ??
              conflict.nodeAggregateId ??
              t('workspace.conflict.unknownNode', 'Unknown node')
            const canNavigate =
              onNavigate !== undefined &&
              conflict.documentAddress !== null &&
              conflict.documentLabel !== null
            return (
              <li
                key={conflict.nodeAggregateId ?? index}
                className="flex items-start gap-3 rounded-sm bg-muted px-3 py-2"
              >
                <i
                  className={`fas fa-fw ${meta?.icon ?? 'fa-circle-exclamation'} mt-0.5 text-muted-foreground`}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate type-body text-foreground">
                    {title}
                    {meta ? (
                      <span className="text-muted-foreground">
                        {' '}
                        — {t(meta.verbKey, meta.verb)}
                      </span>
                    ) : null}
                  </div>
                  <div className="type-small text-muted-foreground">
                    {reasonText(conflict)}
                  </div>
                  {canNavigate ? (
                    <button
                      type="button"
                      className="mt-1 type-small text-primary-text hover:underline"
                      onClick={() => onNavigate!(conflict.documentAddress!)}
                    >
                      <i
                        className="fas fa-fw fa-arrow-up-right-from-square"
                        aria-hidden
                      />{' '}
                      {conflict.documentLabel}
                    </button>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ul>

        <DialogFooter>
          <Button variant="secondary" onClick={onCancel} disabled={busy}>
            {t('action.cancel', 'Cancel')}
          </Button>
          {onDiscardAll ? (
            <Button
              variant={partial ? 'destructive' : 'secondary'}
              onClick={onDiscardAll}
              disabled={busy}
            >
              {t('workspace.conflict.discardAllChanges', 'Discard all changes')}
            </Button>
          ) : null}
          {!partial && onForce ? (
            <Button variant="destructive" onClick={onForce} disabled={busy}>
              {t(
                'workspace.conflict.discardConflicting',
                'Discard conflicting changes',
              )}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
