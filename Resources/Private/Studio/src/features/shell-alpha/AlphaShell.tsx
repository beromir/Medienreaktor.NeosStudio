import * as React from 'react'
import type { Node } from '@/api/neos/schema'
import { useStudio } from '@/app/StudioContext'
import type { EditingContext } from '@/app/useEditingContext'
import type { HistoryLocation } from '@/features/history/location'
import { PanelBody, usePanelSwitcher } from '@/features/panels/PanelSystem'
import {
  panelRegistry,
  panelTitle,
  type PanelDefinition,
} from '@/features/panels/registry'
import { onPanelRevealRequest } from '@/features/panels/reveal'
import {
  resetPreviewChrome,
  setPreviewChrome,
} from '@/features/preview/chromeStore'
import { translate as t } from '@/lib/i18n'
import { useRegistry } from '@/lib/registry'
import { cn } from '@/lib/utils'
import { ActionBar } from './ActionBar'
import { CloseIcon } from './icons'
import { IconButton, PinButton } from './primitives'
import {
  closeDocked,
  type Dock,
  EMPTY_DOCK,
  keepOpen,
  openDocked,
  restoreDock,
  toggleDocked,
  togglePin,
} from './dock'
import { PropertiesPanel } from './PropertiesPanel'
import { Rail } from './Rail'
import { DEVICE_WIDTHS, type Device, TopBar } from './TopBar'

const EDITOR = 'visual-editor'
const DOCK_KEY = 'neos-studio.alpha.dock'
const DEVICE_KEY = 'neos-studio.alpha.device'
/** Panels with a place of their own in this layout, not in the rail. */
const PLACED_ELSEWHERE = new Set(['documents', 'inspector'])
const EDITOR_TOOLS = ['outline', 'clipboard', 'trash']
/** The Properties panel: the shell's own, not a registered panel. */
export const PROPERTIES = 'shellAlpha:properties'
const PROPERTIES_DEFINITION: PanelDefinition = {
  id: PROPERTIES,
  title: () => t('shellAlpha.properties', 'Properties'),
  component: () => null,
  defaultPlacement: { kind: 'dock', region: 'sidebar' },
}

/**
 * The alpha layout: top bar, rail, one docked panel and the preview card
 * with the floating action bar. Panels - built-in and plugin ones - come
 * from the panel registry: main-region panels are the rail's modes, the
 * others its panel buttons, opening docked between rail and preview.
 */
export function AlphaShell({
  editing,
  document,
  onSelectSite,
  onChangeDimension,
  onVariantCreated,
  onSwitchEditingContext,
  onReload,
  onReveal,
}: {
  editing: EditingContext
  document: Node | null
  onSelectSite: (nodeName: string) => void
  onChangeDimension: (point: string) => void
  onVariantCreated: (point: string) => void
  onSwitchEditingContext: (workspaceName: string | null) => void
  onReload: () => void
  onReveal: (location: HistoryLocation) => void
}) {
  const definitions = useRegistry(panelRegistry)
  const { activate, activeMainPanel } = usePanelSwitcher()

  const modes = definitions.filter(
    (definition) =>
      definition.defaultPlacement.kind === 'dock' &&
      definition.defaultPlacement.region === 'main',
  )
  const mode = modes.some((definition) => definition.id === activeMainPanel)
    ? activeMainPanel!
    : EDITOR

  const railPanels = React.useMemo(() => {
    const others = definitions.filter(
      (definition) =>
        !PLACED_ELSEWHERE.has(definition.id) &&
        !(
          definition.defaultPlacement.kind === 'dock' &&
          definition.defaultPlacement.region === 'main'
        ),
    )
    const tools = EDITOR_TOOLS.flatMap(
      (id) => others.find((definition) => definition.id === id) ?? [],
    )
    // Plugin panels, then History last - as drawn: Comments, History.
    const rest = others.filter(
      (definition) =>
        !EDITOR_TOOLS.includes(definition.id) && definition.id !== 'history',
    )
    const history = others.find((definition) => definition.id === 'history')
    const second = [...rest, ...(history ? [history] : [])]
    return [
      PROPERTIES_DEFINITION,
      ...tools,
      ...(tools.length && second.length ? [null] : []),
      ...second,
    ]
  }, [definitions])

  const exists = React.useCallback(
    (panel: string) =>
      panel === PROPERTIES ||
      panelRegistry.getAll().some((definition) => definition.id === panel),
    [],
  )
  const [storedDock, setDock] = usePersistedState<Dock>(DOCK_KEY, EMPTY_DOCK)
  const dock = restoreDock(storedDock, exists)
  const dockedDefinitions =
    mode !== EDITOR
      ? []
      : dock.open.flatMap(
          (panel) =>
            (panel === PROPERTIES
              ? PROPERTIES_DEFINITION
              : definitions.find((definition) => definition.id === panel)) ??
            [],
        )
  const propertiesDocked = dockedDefinitions.some(
    (definition) => definition.id === PROPERTIES,
  )
  const updateDock = React.useCallback(
    (change: (dock: Dock) => Dock) =>
      setDock((current) => change(restoreDock(current, exists))),
    [setDock, exists],
  )

  // Reveal requests for panels that are not modes open them docked (the
  // panel system handles the modes itself).
  React.useEffect(
    () =>
      onPanelRevealRequest((panel) => {
        const definition = panelRegistry
          .getAll()
          .find((candidate) => candidate.id === panel)
        if (
          !definition ||
          (definition.defaultPlacement.kind === 'dock' &&
            definition.defaultPlacement.region === 'main') ||
          definition.id === 'documents'
        )
          return
        activate(EDITOR)
        updateDock((current) => openDocked(current, panel))
      }),
    [activate, updateDock],
  )

  const [device, setDevice] = usePersistedState<Device>(DEVICE_KEY, 'desktop')
  React.useEffect(() => {
    setPreviewChrome({ deviceWidth: DEVICE_WIDTHS[device] ?? null })
  }, [device])
  React.useEffect(() => resetPreviewChrome, [])

  // Modes stay mounted once visited (like the classic tabs), so going back
  // to the editor does not reload the preview.
  const [visited, setVisited] = React.useState<ReadonlySet<string>>(
    () => new Set([EDITOR]),
  )
  if (!visited.has(mode)) setVisited(new Set(visited).add(mode))

  return (
    <div className="flex h-svh min-w-0 flex-1 flex-col bg-shell-ground px-2 pb-2 text-shell-text">
      <TopBar
        editing={editing}
        document={document}
        device={device}
        onDeviceChange={setDevice}
        onSelectSite={onSelectSite}
        onChangeDimension={onChangeDimension}
        onVariantCreated={onVariantCreated}
        onSwitchEditingContext={onSwitchEditingContext}
        onOpenMode={activate}
      />
      <div className="flex min-h-0 flex-1 gap-2">
        <Rail
          modes={modes}
          mode={mode}
          onModeChange={activate}
          panels={mode === EDITOR ? railPanels : []}
          docked={dockedDefinitions.map((definition) => definition.id)}
          onToggleDocked={(panel) =>
            updateDock((current) => toggleDocked(current, panel))
          }
        />
        {dockedDefinitions.map((definition) => {
          const pin = (
            <PinButton
              pinned={dock.pinned === definition.id}
              onClick={() =>
                updateDock((current) => togglePin(current, definition.id))
              }
            />
          )
          const close = () =>
            updateDock((current) => closeDocked(current, definition.id))
          return definition.id === PROPERTIES ? (
            <PropertiesPanel key={definition.id} pin={pin} onClose={close} />
          ) : (
            <DockedPanel
              key={definition.id}
              definition={definition}
              pin={pin}
              onClose={close}
            />
          )
        })}
        <main className="flex min-w-0 flex-1 flex-col rounded-shell-surface border border-shell-border bg-shell-surface p-1.5">
          <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-shell-site">
            {modes
              .filter((definition) => visited.has(definition.id))
              .map((definition) => (
                <div
                  key={definition.id}
                  className={cn(
                    'flex min-h-0 flex-1 flex-col',
                    definition.id !== EDITOR && 'overflow-y-auto',
                    definition.id !== mode && 'hidden',
                  )}
                >
                  <PanelBody
                    panel={definition.id}
                    component={definition.component}
                    visible={definition.id === mode}
                  />
                </div>
              ))}
            {mode === EDITOR && (
              <ActionBar
                onOpenMode={activate}
                propertiesDocked={propertiesDocked}
                propertiesPinned={dock.pinned === PROPERTIES}
                onKeepOpen={() =>
                  updateDock((current) => keepOpen(current, PROPERTIES))
                }
                onHistoryApplied={onReload}
                onReveal={onReveal}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

function DockedPanel({
  definition,
  pin,
  onClose,
}: {
  definition: PanelDefinition
  pin: React.ReactNode
  onClose: () => void
}) {
  const { selectedDocument } = useStudio()
  return (
    <aside
      aria-label={panelTitle(definition)}
      className="flex w-70 shrink-0 flex-col overflow-hidden rounded-shell-surface border border-shell-border bg-shell-surface"
    >
      <div className="flex h-12 shrink-0 items-center justify-between pr-2 pl-3.5">
        <div className="flex min-w-0 items-baseline gap-2">
          <span className="type-shell-control font-semibold text-shell-text">
            {panelTitle(definition)}
          </span>
          {selectedDocument && (
            <span className="truncate type-shell-secondary text-shell-subtle">
              {selectedDocument.label}
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          {pin}
          <IconButton
            size="sm"
            className="size-7 rounded-shell-control text-shell-muted"
            onClick={onClose}
            aria-label={t('common.close', 'Close')}
          >
            <CloseIcon />
          </IconButton>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <PanelBody
          key={definition.id}
          panel={definition.id}
          component={definition.component}
          visible
        />
      </div>
    </aside>
  )
}

function usePersistedState<T>(
  key: string,
  initial: T,
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = React.useState<T>(() => {
    try {
      const stored = localStorage.getItem(key)
      return stored === null ? initial : (JSON.parse(stored) as T)
    } catch {
      return initial
    }
  })
  React.useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value))
  }, [key, value])
  return [value, setValue]
}
