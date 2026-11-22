import { useState } from 'react'
import {
  countChangedNodes,
  useWorkspaceChanges,
} from '@/api/neos/endpoints/workspaces'
import type { NodeAddress, Workspace } from '@/api/neos/schema'
import { useStudio } from '@/app/StudioContext'
import { Button } from '@/components/ui/button'
import { CountBadge } from '@/components/ui/count-badge'
import { useKeyboardShortcut } from '@/features/shortcuts/useKeyboardShortcut'
import { translate as t } from '@/lib/i18n'
import { ReviewChangesDialog } from './ReviewChangesDialog'
import { useCanPublish } from './useWorkspacePublishing'

/**
 * The topbar's single publish entry point: opens the Review changes dialog -
 * publishing always goes through the review, never straight from the topbar.
 * Always enabled, since every editor may review (the dialog also covers any
 * other source/target pair the account can see); publishing itself is gated
 * inside the dialog by useCanPublish (Neos.Neos:LivePublisher for live).
 *
 * Colored while the active workspace has changes the account may publish -
 * blue into live, purple into a shared workspace - neutral otherwise. Carries
 * the pending-changes bubble for the active workspace, scoped to the active
 * site (plus changes whose site could not be resolved - never silently hide a
 * pending change), matching the review list.
 */
export function PublishReviewButton({
  workspaces,
  activeWorkspace,
  onNavigate,
  segment = false,
}: {
  workspaces: Workspace[]
  activeWorkspace: Workspace
  /** See ReviewChangesDialog: show a document, switching the context first. */
  onNavigate: (address: NodeAddress, workspaceName: string) => void
  /**
   * The trailing segment of the alpha layout's workspace pill: the pending
   * count and "Review", or "Up to date" - neutral either way.
   */
  segment?: boolean
}) {
  const [open, setOpen] = useState(false)
  // Same query the trees' dirty markers use, so the bubble always agrees.
  const { data: changesResponse } = useWorkspaceChanges(activeWorkspace.name)
  const { site } = useStudio()
  const siteId = site?.nodeAggregateId ?? null
  const allChanges = changesResponse?.changes ?? []
  const changeCount = countChangedNodes(
    siteId
      ? allChanges.filter(
          (c) => c.siteAggregateId === siteId || c.siteAggregateId === null,
        )
      : allChanges,
  )
  const canPublish = useCanPublish(activeWorkspace, workspaces)
  const hasChanges = changeCount > 0

  const baseWorkspace = workspaces.find(
    (w) => w.name === activeWorkspace.baseWorkspaceName,
  )
  const targetLabel =
    baseWorkspace?.classification === 'root'
      ? t('workspace.live', 'Live')
      : baseWorkspace?.title ||
        activeWorkspace.baseWorkspaceName ||
        t('workspace.baseWorkspaceFallback', 'the base workspace')

  // Active (changes the account may publish): colored like the switcher's
  // target badge - primary blue into live, purple into anything else.
  const active = hasChanges && canPublish
  const activeClasses =
    baseWorkspace?.classification === 'root'
      ? undefined
      : 'bg-workspace-shared text-workspace-shared-foreground hover:bg-workspace-shared/90'

  // The former "publish all" shortcut now opens the review as well.
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

  const dialog = (
    <ReviewChangesDialog
      workspaces={workspaces}
      activeWorkspace={activeWorkspace}
      open={open}
      onOpenChange={setOpen}
      onNavigate={onNavigate}
      preselectAll
    />
  )

  if (segment) {
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          title={t(
            'workspace.review.buttonHint',
            'Review pending changes between workspaces',
          )}
          className={
            hasChanges
              ? 'flex h-6.5 cursor-pointer items-center gap-1.75 rounded-full bg-shell-ground pr-2.5 pl-2 type-shell-control font-medium text-shell-text outline-none hover:bg-shell-hover focus-visible:ring-2 focus-visible:ring-shell-accent/60'
              : 'flex h-6.5 cursor-pointer items-center rounded-full px-2.5 type-shell-control text-[#5a5a5a] outline-none hover:text-shell-muted focus-visible:ring-2 focus-visible:ring-shell-accent/60'
          }
        >
          {hasChanges ? (
            <>
              <span
                className="flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-shell-accent-tint px-1.25 type-shell-count text-shell-accent-light"
                aria-label={t('workspace.pendingBadge', '{0} pending changes', [
                  changeCount,
                ])}
              >
                {changeCount}
              </span>
              {t('workspace.review.short', 'Review')}
            </>
          ) : (
            t('workspace.upToDate', 'Up to date')
          )}
        </button>
        {dialog}
      </>
    )
  }

  return (
    <>
      <div className="relative">
        <Button
          variant={active ? 'default' : 'secondary'}
          className={active ? activeClasses : undefined}
          onClick={() => setOpen(true)}
          title={
            canPublish
              ? t(
                  'workspace.review.buttonHint',
                  'Review pending changes between workspaces',
                )
              : t(
                  'workspace.publishDenied',
                  'You are not allowed to publish to "{0}"',
                  [targetLabel],
                )
          }
        >
          <i className="fas fa-fw fa-check" aria-hidden />
          <span className="hidden @[52.5rem]:inline">
            {t('workspace.reviewAndPublish', 'Review and publish')}
          </span>
        </Button>
        {hasChanges && (
          <CountBadge
            count={changeCount}
            className="absolute -top-2 -right-1"
            aria-label={t('workspace.pendingBadge', '{0} pending changes', [
              changeCount,
            ])}
          />
        )}
      </div>

      {dialog}
    </>
  )
}
