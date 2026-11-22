import { useWorkspaceChanges } from '@/api/neos/endpoints/workspaces'
import { useStudioActions } from '@/app/StudioContext'
import { Button } from '@/components/ui/button'
import { translate as t } from '@/lib/i18n'
import { WarningIcon } from '@/features/shell-alpha/icons'
import { ConflictResolutionDialog } from './ConflictResolutionDialog'
import { useWorkspaceSync } from './useWorkspaceSync'

/**
 * Topbar button that appears when the workspace is outdated - someone
 * published to the base workspace since the last rebase - and synchronizes
 * it (a workspace rebase: incoming changes flow in underneath the own
 * pending ones). When own changes conflict with the incoming ones the rebase
 * fails and the conflict dialog offers to force it (dropping the conflicting
 * changes) or discard the workspace entirely.
 */
export function SyncWorkspaceButton({
  workspaceName,
  segment = false,
}: {
  workspaceName: string
  /** The orange segment of the alpha layout's workspace pill. */
  segment?: boolean
}) {
  // Same query the publish button uses; its status field tells us whether
  // the base workspace has moved on.
  const { data: changesResponse } = useWorkspaceChanges(workspaceName)
  const { navigateToNode } = useStudioActions()
  const { rebase, discardAll, conflicts, clearConflicts, busy } =
    useWorkspaceSync()

  if (changesResponse?.workspace.status !== 'outdated') return null

  const hint = t(
    'workspace.sync.hint',
    'Others published changes to the base workspace. Synchronize to pull them into this workspace.',
  )

  return (
    <>
      {segment ? (
        <button
          type="button"
          disabled={rebase.isPending}
          onClick={() => rebase.mutate({ workspaceName })}
          title={hint}
          className="flex h-6.5 cursor-pointer items-center gap-1.75 rounded-full bg-shell-conflict pr-2.5 pl-2 type-shell-control font-semibold text-shell-surface outline-none hover:brightness-110 focus-visible:ring-2 focus-visible:ring-white/60 disabled:opacity-60"
        >
          <WarningIcon />
          {t('workspace.sync.action', 'Synchronize')}
        </button>
      ) : (
        <Button
          size="icon"
          // Only shown while the workspace is outdated - that deserves
          // attention, so it is always orange.
          className="bg-workspace-outdated text-workspace-outdated-foreground hover:bg-workspace-outdated/90"
          disabled={rebase.isPending}
          onClick={() => rebase.mutate({ workspaceName })}
          title={t(
            'workspace.sync.hint',
            'Others published changes to the base workspace. Synchronize to pull them into this workspace.',
          )}
          aria-label={t('workspace.sync.action', 'Synchronize')}
        >
          <i
            className={`fas fa-fw fa-rotate ${rebase.isPending ? 'fa-spin' : ''}`}
            aria-hidden
          />
        </Button>
      )}

      <ConflictResolutionDialog
        open={conflicts !== null}
        workspaceName={conflicts?.workspaceName ?? null}
        conflicts={conflicts?.conflicts ?? []}
        partial={conflicts?.title === 'partial'}
        busy={busy}
        onCancel={clearConflicts}
        onForce={() =>
          conflicts &&
          rebase.mutate({
            workspaceName: conflicts.workspaceName,
            strategy: 'force',
          })
        }
        onDiscardAll={() =>
          conflicts && discardAll.mutate(conflicts.workspaceName)
        }
        onNavigate={(address) => {
          clearConflicts()
          navigateToNode(address)
        }}
      />
    </>
  )
}
