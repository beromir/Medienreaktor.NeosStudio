import * as React from 'react'
import { useWorkspaceChanges } from '@/api/neos/endpoints/workspaces'
import { useNodeVariants } from '@/api/neos/endpoints/nodes'
import type { Node, NodeAddress } from '@/api/neos/schema'
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
import { PublishReviewButton } from '@/features/workspaces/PublishReviewButton'
import { SyncWorkspaceButton } from '@/features/workspaces/SyncWorkspaceButton'
import { WorkspaceSwitcher } from '@/features/workspaces/WorkspaceSwitcher'
import { useRegistry } from '@/lib/registry'
import { translate as t } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import {
  ChevronDownIcon,
  CollapseLeftIcon,
  DesktopIcon,
  ExternalIcon,
  LinkIcon,
  PageIcon,
  PhoneIcon,
  TabletIcon,
} from './icons'
import { LocationSeparator } from './LocationSeparator'
import { ShellPopover } from './primitives'

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
  onNavigate,
}: {
  editing: EditingContext
  document: Node | null
  device: Device
  onDeviceChange: (device: Device) => void
  onSelectSite: (nodeName: string) => void
  onChangeDimension: (point: string) => void
  onVariantCreated: (point: string) => void
  onSwitchEditingContext: (workspaceName: string | null) => void
  onNavigate: (address: NodeAddress, workspaceName: string) => void
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
        <DeviceToggle device={device} onChange={onDeviceChange} />
        {document && <LinkButton document={document} />}
        {document && (
          <a
            href={previewHref(document)}
            target={PREVIEW_WINDOW}
            title={t('preview.openInNewTab', 'Open page in a new tab')}
            className={cn(
              topPill,
              'gap-1.75 pr-3 pl-3.5 type-shell-control font-medium text-shell-text outline-none hover:bg-shell-hover focus-visible:ring-2 focus-visible:ring-shell-accent/60',
            )}
          >
            {t('shellAlpha.preview', 'Preview')}
            <ExternalIcon />
          </a>
        )}
        {personalWorkspace && activeWorkspace && (
          <WorkspacePill
            editing={editing}
            onSwitchEditingContext={onSwitchEditingContext}
            onNavigate={onNavigate}
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
function PageSegment({ document }: { document: Node | null }) {
  const [open, setOpen] = React.useState(false)
  const panels = useRegistry(panelRegistry)
  const documents = panels.find((definition) => definition.id === 'documents')
  return (
    <ShellPopover
      open={open}
      onOpenChange={setOpen}
      sideOffset={8}
      className="flex h-[min(36rem,calc(100svh-5rem))] w-95 flex-col overflow-hidden"
      trigger={
        <button
          type="button"
          className="flex h-6.5 min-w-0 cursor-pointer items-center gap-1.75 rounded-full pr-2.25 pl-2.5 type-shell-control font-semibold text-shell-text outline-none hover:bg-shell-hover focus-visible:ring-2 focus-visible:ring-shell-accent/60 data-popup-open:bg-shell-hover"
          aria-label={t('shellAlpha.pageTree', 'Pages')}
        >
          <PageIcon />
          <span className="truncate">
            {document ? document.label || document.nodeAggregateId : '…'}
          </span>
          <ChevronDownIcon className="text-shell-muted" />
        </button>
      }
    >
      {documents && (
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
      )}
    </ShellPopover>
  )
}

function DeviceToggle({
  device,
  onChange,
}: {
  device: Device
  onChange: (device: Device) => void
}) {
  const [expanded, setExpanded] = React.useState(false)
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
  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        title={labels[device]}
        aria-label={t('shellAlpha.device.label', 'Device preview')}
        aria-expanded={false}
        className="flex h-8 cursor-pointer items-center gap-1.5 rounded-full px-2.5 text-shell-text outline-none hover:bg-shell-hover focus-visible:ring-2 focus-visible:ring-shell-accent/60"
      >
        {icons[device]}
        <ChevronDownIcon className="text-shell-muted" />
      </button>
    )
  }
  return (
    <div
      role="radiogroup"
      aria-label={t('shellAlpha.device.label', 'Device preview')}
      className="flex h-9 items-center gap-0.5 rounded-full bg-shell-input px-0.75"
    >
      {(Object.keys(icons) as Device[]).map((option) => (
        <button
          key={option}
          type="button"
          role="radio"
          aria-checked={option === device}
          title={labels[option]}
          aria-label={labels[option]}
          onClick={() => onChange(option)}
          className={cn(
            'flex size-7.5 cursor-pointer items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-shell-accent/60',
            option === device
              ? 'bg-shell-hover-inset text-shell-text'
              : 'text-shell-muted hover:text-shell-text',
          )}
        >
          {icons[option]}
        </button>
      ))}
      <button
        type="button"
        onClick={() => setExpanded(false)}
        aria-label={t('shellAlpha.device.collapse', 'Collapse')}
        className="flex h-7.5 w-6.5 cursor-pointer items-center justify-center text-shell-muted outline-none hover:text-shell-text"
      >
        <CollapseLeftIcon />
      </button>
    </div>
  )
}

/** Shares a preview link to the page - Studio's share link dialog. */
function LinkButton({ document }: { document: Node }) {
  const [open, setOpen] = React.useState(false)
  const label = t(
    'share.buttonHint',
    'Share a preview link to this page with people without a login',
  )
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={label}
        aria-label={label}
        className={cn(
          topPill,
          'size-8 cursor-pointer justify-center text-shell-text outline-none hover:bg-shell-hover focus-visible:ring-2 focus-visible:ring-shell-accent/60',
        )}
      >
        <LinkIcon />
      </button>
      {open && (
        <ShareLinkDialog
          key={document.nodeAggregateId}
          document={document}
          open={open}
          onOpenChange={setOpen}
        />
      )}
    </>
  )
}

function WorkspacePill({
  editing,
  onSwitchEditingContext,
  onNavigate,
}: {
  editing: EditingContext
  onSwitchEditingContext: (workspaceName: string | null) => void
  onNavigate: (address: NodeAddress, workspaceName: string) => void
}) {
  const { workspaces, personalWorkspace, activeWorkspace, baseTargets } =
    editing
  const { data: changes } = useWorkspaceChanges(activeWorkspace?.name ?? null)
  if (!personalWorkspace || !activeWorkspace) return null
  const outdated = changes?.workspace.status === 'outdated'
  return (
    <div
      className={cn(
        topPill,
        'gap-1 pr-1',
        outdated && 'border border-shell-conflict/40 bg-shell-conflict/12',
      )}
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
        <PublishReviewButton
          segment
          workspaces={workspaces}
          activeWorkspace={activeWorkspace}
          onNavigate={onNavigate}
        />
      )}
    </div>
  )
}
