import * as React from 'react'
import { useWorkspaceChanges } from '@/api/neos/endpoints/workspaces'
import { useNodeVariants } from '@/api/neos/endpoints/nodes'
import type { Node } from '@/api/neos/schema'
import type { EditingContext } from '@/app/useEditingContext'
import { PresenceAvatars } from '@/features/collaboration/PresenceAvatars'
import { HeaderActions } from '@/features/actions/HeaderActions'
import { CreateVariantDialog } from '@/features/dimensions/CreateVariantDialog'
import { DimensionSwitcher } from '@/features/dimensions/DimensionSwitcher'
import { PanelBody } from '@/features/panels/PanelSystem'
import { panelRegistry } from '@/features/panels/registry'
import { PREVIEW_WINDOW, previewHref } from '@/features/preview/PreviewButton'
import { ShareLinkDialog } from '@/features/sharing/ShareLinkDialog'
import { SiteSwitcher } from '@/features/sites/SiteSwitcher'
import { SyncWorkspaceButton } from '@/features/workspaces/SyncWorkspaceButton'
import { WorkspaceSwitcher } from '@/features/workspaces/WorkspaceSwitcher'
import { useRegistry } from '@/lib/registry'
import { translate as t } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import {
  CheckIcon,
  ChevronDownIcon,
  DesktopIcon,
  ExternalIcon,
  LinkIcon,
  PageIcon,
  PhoneIcon,
  TabletIcon,
} from './icons'
import { LocationSeparator } from './LocationSeparator'
import { PublishSegment } from './PublishPopover'
import { anchorProps, NativePopover, type Placement } from './NativePopover'
import { ShellMenu, ShellMenuItem, Surface } from './primitives'

export type Device = 'desktop' | 'tablet' | 'phone'

/** Preview widths of the device presets, px. */
export const DEVICE_WIDTHS: Record<Device, number | null> = {
  desktop: null,
  tablet: 768,
  phone: 390,
}

const topPill = 'flex h-8 shrink-0 items-center rounded-full bg-shell-surface'

export function TopBar({
  editing,
  document,
  device,
  onDeviceChange,
  onSelectSite,
  onChangeDimension,
  onVariantCreated,
  onSwitchEditingContext,
  onOpenMode,
}: {
  editing: EditingContext
  document: Node | null
  device: Device
  onDeviceChange: (device: Device) => void
  onSelectSite: (nodeName: string) => void
  onChangeDimension: (point: string) => void
  onVariantCreated: (point: string) => void
  onSwitchEditingContext: (workspaceName: string | null) => void
  onOpenMode: (panel: string) => void
}) {
  const {
    sites,
    site,
    personalWorkspace,
    activeWorkspace,
    contentRepository,
    dimensions,
    allowedEditablePoints,
    dimensionSpacePoint,
  } = editing
  const [variantRequest, setVariantRequest] = React.useState<string | null>(
    null,
  )
  const { data: documentVariants } = useNodeVariants(document)

  return (
    <header className="flex h-13 shrink-0 items-center gap-3">
      <div className="flex min-w-0 flex-1 items-center">
        <div className={cn(topPill, 'min-w-0 px-1')}>
          {sites.length > 0 && activeWorkspace && dimensionSpacePoint && (
            <SiteSwitcher
              segment
              sites={sites}
              workspaceName={activeWorkspace.name}
              dimensionSpacePoint={dimensionSpacePoint}
              value={site?.nodeName ?? null}
              onChange={onSelectSite}
            />
          )}
          {dimensions.length > 0 && dimensionSpacePoint && (
            <DimensionSwitcher
              segment
              dimensions={dimensions}
              allowedPoints={contentRepository?.dimensionSpacePoints ?? []}
              permittedPoints={allowedEditablePoints}
              value={dimensionSpacePoint}
              documentCoverage={
                document
                  ? documentVariants?.meta.coveredDimensionSpacePoints
                  : undefined
              }
              onCreateVariant={setVariantRequest}
              onChange={onChangeDimension}
            />
          )}
          <LocationSeparator />
          <PageSegment document={document} />
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-end gap-2">
        <HeaderActions
          document={document}
          workspaceName={activeWorkspace?.name ?? null}
        />
        <PresenceAvatars />
        <ViewPill
          document={document}
          device={device}
          onDeviceChange={onDeviceChange}
        />
        {personalWorkspace && activeWorkspace && (
          <WorkspacePill
            editing={editing}
            onSwitchEditingContext={onSwitchEditingContext}
            onOpenMode={onOpenMode}
          />
        )}
      </div>

      {variantRequest && document && activeWorkspace && (
        <CreateVariantDialog
          document={document}
          targetPoint={variantRequest}
          dimensions={dimensions}
          workspaceName={activeWorkspace.name}
          onCancel={() => setVariantRequest(null)}
          onCreated={(point) => {
            setVariantRequest(null)
            onVariantCreated(point)
          }}
        />
      )}
    </header>
  )
}

/**
 * The page segment: opens the page tree - Studio's Documents panel (tree,
 * filter, new page, drag to reorder) in a dropdown.
 */
const PAGE_TREE_ID = 'shell-alpha-page-tree'
const PAGE_ANCHOR = '--shell-alpha-page'
const PAGE_TREE_PLACEMENT: Placement = {
  side: 'bottom',
  align: 'start',
  offset: 8,
}

function PageSegment({ document }: { document: Node | null }) {
  const [open, setOpen] = React.useState(false)
  const panels = useRegistry(panelRegistry)
  const documents = panels.find((definition) => definition.id === 'documents')
  return (
    <>
      <button
        type="button"
        popoverTarget={PAGE_TREE_ID}
        aria-expanded={open}
        data-popup-open={open || undefined}
        className="flex h-6.5 min-w-0 cursor-pointer items-center gap-1.75 rounded-full pr-2.25 pl-2.5 type-shell-control font-semibold text-shell-text outline-none hover:bg-shell-hover focus-visible:ring-2 focus-visible:ring-shell-accent/60 data-popup-open:bg-shell-hover"
        aria-label={t('shellAlpha.pageTree', 'Pages')}
        {...anchorProps(PAGE_ANCHOR)}
      >
        <PageIcon />
        <span className="truncate">
          {document ? document.label || document.nodeAggregateId : '…'}
        </span>
        <ChevronDownIcon className="text-shell-muted" />
      </button>
      <NativePopover
        id={PAGE_TREE_ID}
        anchor={PAGE_ANCHOR}
        placement={PAGE_TREE_PLACEMENT}
        open={open}
        onOpenChange={setOpen}
      >
        {documents && (
          <Surface className="flex h-[min(36rem,calc(100svh-5rem))] w-95 flex-col overflow-hidden">
            <div
              className="min-h-0 flex-1 overflow-y-auto"
              // Picking a page is "go there": close the dropdown.
              onClickCapture={(event) => {
                const row = (event.target as HTMLElement).closest(
                  '[role="treeitem"]',
                )
                if (row && !(event.target as HTMLElement).closest('button')) {
                  window.setTimeout(() => setOpen(false), 0)
                }
              }}
            >
              <PanelBody
                panel={documents.id}
                component={documents.component}
                visible={open}
              />
            </div>
          </Surface>
        )}
      </NativePopover>
    </>
  )
}

/**
 * How the page is viewed: the device preset, sharing a preview link and
 * opening the page in a new tab - plain buttons in one pill.
 */
function ViewPill({
  document,
  device,
  onDeviceChange,
}: {
  document: Node | null
  device: Device
  onDeviceChange: (device: Device) => void
}) {
  const [sharing, setSharing] = React.useState(false)
  const icons: Record<Device, React.ReactNode> = {
    desktop: <DesktopIcon />,
    tablet: <TabletIcon />,
    phone: <PhoneIcon />,
  }
  const labels: Record<Device, string> = {
    desktop: t('shellAlpha.device.desktop', 'Desktop'),
    tablet: t('shellAlpha.device.tablet', 'Tablet'),
    phone: t('shellAlpha.device.phone', 'Phone'),
  }
  const shareLabel = t(
    'share.buttonHint',
    'Share a preview link to this page with people without a login',
  )
  const plain =
    'flex h-6.5 shrink-0 cursor-pointer items-center rounded-full text-shell-text outline-none hover:bg-shell-hover focus-visible:ring-2 focus-visible:ring-shell-accent/60 data-popup-open:bg-shell-hover'
  return (
    <div className={cn(topPill, 'gap-0.5 px-0.75')}>
      <ShellMenu
        align="end"
        sideOffset={9}
        className="w-40"
        trigger={
          <button
            type="button"
            title={labels[device]}
            aria-label={t('shellAlpha.device.label', 'Device preview')}
            className={cn(plain, 'gap-1.5 pr-2.5 pl-2.75')}
          >
            {icons[device]}
            <ChevronDownIcon className="text-shell-muted" />
          </button>
        }
      >
        {(Object.keys(icons) as Device[]).map((option) => (
          <ShellMenuItem
            key={option}
            icon={icons[option]}
            trailing={
              option === device ? (
                <span className="text-shell-accent-light">
                  <CheckIcon />
                </span>
              ) : undefined
            }
            onClick={() => onDeviceChange(option)}
          >
            {labels[option]}
          </ShellMenuItem>
        ))}
      </ShellMenu>
      {document && (
        <>
          <div className="h-4 w-px shrink-0 bg-shell-divider" aria-hidden />
          <button
            type="button"
            onClick={() => setSharing(true)}
            title={shareLabel}
            aria-label={shareLabel}
            className={cn(plain, 'w-6.5 justify-center')}
          >
            <LinkIcon />
          </button>
          <a
            href={previewHref(document)}
            target={PREVIEW_WINDOW}
            title={t('preview.openInNewTab', 'Open page in a new tab')}
            className={cn(
              plain,
              'gap-1.75 pr-3 pl-3.5 type-shell-control font-medium',
            )}
          >
            {t('shellAlpha.preview', 'Preview')}
            <ExternalIcon />
          </a>
          {sharing && (
            <ShareLinkDialog
              key={document.nodeAggregateId}
              document={document}
              open={sharing}
              onOpenChange={setSharing}
            />
          )}
        </>
      )}
    </div>
  )
}

const WORKSPACE_ANCHOR = '--shell-alpha-workspace-pill'

function WorkspacePill({
  editing,
  onSwitchEditingContext,
  onOpenMode,
}: {
  editing: EditingContext
  onSwitchEditingContext: (workspaceName: string | null) => void
  onOpenMode: (panel: string) => void
}) {
  const { workspaces, personalWorkspace, activeWorkspace, baseTargets } =
    editing
  const { data: changes } = useWorkspaceChanges(activeWorkspace?.name ?? null)
  const [conflict, setConflict] = React.useState(false)
  if (!personalWorkspace || !activeWorkspace) return null
  const outdated = changes?.workspace.status === 'outdated'
  return (
    <div
      className={cn(
        topPill,
        'gap-1 pr-1',
        (outdated || conflict) &&
          'border border-shell-conflict/40 bg-shell-conflict/12',
      )}
      {...anchorProps(WORKSPACE_ANCHOR)}
    >
      {baseTargets.length > 0 ? (
        <WorkspaceSwitcher
          segment
          personalWorkspace={personalWorkspace}
          activeWorkspace={activeWorkspace}
          targets={baseTargets}
          onSwitchEditingContext={onSwitchEditingContext}
        />
      ) : (
        <span className="pl-3 type-shell-control text-shell-text">
          {t('workspace.myWorkspace', 'My workspace')}
        </span>
      )}
      <div className="h-4 w-px shrink-0 bg-shell-divider" aria-hidden />
      {outdated ? (
        <SyncWorkspaceButton segment workspaceName={activeWorkspace.name} />
      ) : (
        <PublishSegment
          workspaces={workspaces}
          activeWorkspace={activeWorkspace}
          anchor={WORKSPACE_ANCHOR}
          onConflictChange={setConflict}
          onOpenWorkspaces={() => onOpenMode('workspaces')}
        />
      )}
    </div>
  )
}
