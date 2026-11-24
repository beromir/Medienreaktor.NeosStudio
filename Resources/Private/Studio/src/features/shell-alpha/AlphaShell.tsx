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
import { TreeStyleContext } from '@/features/tree/treeStyle'
import { translate as t } from '@/lib/i18n'
import { useRegistry } from '@/lib/registry'
import { cn } from '@/lib/utils'
import { ActionBar } from './ActionBar'
import {
  closeFloating,
  closeLeft,
  NO_PANELS,
  openLeft,
  type Panels,
  PROPERTIES,
  restorePanels,
  setProperties,
  toggleLeft,
  togglePinned,
} from './dock'
import { PAGES, PagesPanel } from './PagesPanel'
import { usePinnedPanels } from './preferences'
import { PanelHeader, PinButton } from './primitives'
import { PropertiesPanel } from './PropertiesPanel'
import { Rail } from './Rail'
import { DEVICE_WIDTHS, type Device, TopBar } from './TopBar'

const EDITOR = 'visual-editor'
const PANELS_KEY = 'neos-studio.alpha.panels'
const DEVICE_KEY = 'neos-studio.alpha.device'
/** Panels with a place of their own in this layout, not in the rail. */
const PLACED_ELSEWHERE = new Set(['documents', 'inspector'])
const EDITOR_TOOLS = ['outline', 'clipboard', 'trash']
/** Pages: the shell's own document tree panel, first in the rail. */
const PAGES_DEFINITION: PanelDefinition = {
  id: PAGES,
  title: () => t('shellAlpha.pages', 'Pages'),
  component: () => null,
  defaultPlacement: { kind: 'dock', region: 'sidebar' },
}

/*
 * Floating panels lie over the preview card, 14px inside its edges. The
 * action bar centres between them: its stack sits in the card's content
 * box, 7px (border and padding) inside the card.
 */
const LEFT_WIDTH = 280
const RIGHT_WIDTH = 300
const FLOAT_INSET = 14
const CARD_INSET = 7

/**
 * The alpha layout: top bar, rail, the preview card with the floating
 * action bar, a left panel and the Properties panel on the right. Panels -
 * built-in and plugin ones - come from the panel registry: main-region
 * panels are the rail's modes, the others its panel buttons.
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
  const { inspectedNode, selectedDocument, inspectNode } = useStudio()

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
      PAGES_DEFINITION,
      ...tools,
      ...(second.length ? [null] : []),
      ...second,
    ]
  }, [definitions])

  const exists = React.useCallback(
    (panel: string) =>
      panel === PAGES ||
      panelRegistry.getAll().some((definition) => definition.id === panel),
    [],
  )
  const [storedPanels, setPanels] = usePersistedState<Panels>(
    PANELS_KEY,
    NO_PANELS,
  )
  const panels = restorePanels(storedPanels, exists)
  const updatePanels = React.useCallback(
    (change: (panels: Panels) => Panels) =>
      setPanels((current) => change(restorePanels(current, exists))),
    [setPanels, exists],
  )
  const [pinnedPanels, setPinnedPanels] = usePinnedPanels()
  const isPinned = (panel: string) => pinnedPanels.includes(panel)
  const pinButton = (panel: string) => (
    <PinButton
      pinned={isPinned(panel)}
      onClick={() => setPinnedPanels(togglePinned(pinnedPanels, panel))}
    />
  )

  const editor = mode === EDITOR
  const leftDefinition =
    !editor || panels.left === null
      ? null
      : panels.left === PAGES
        ? PAGES_DEFINITION
        : (definitions.find((definition) => definition.id === panels.left) ??
          null)
  const leftPinned = leftDefinition !== null && isPinned(leftDefinition.id)
  const propertiesOpen = editor && panels.properties
  const propertiesPinned = propertiesOpen && isPinned(PROPERTIES)

  // Reveal requests for panels that are not modes open them on the left
  // (the panel system handles the modes itself).
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
          PLACED_ELSEWHERE.has(definition.id)
        )
          return
        activate(EDITOR)
        updatePanels((current) => openLeft(current, panel))
      }),
    [activate, updatePanels],
  )

  // Esc: deselects the element (the page becomes the selection), then
  // closes what floats. False when there was nothing to do.
  const escape = (): boolean => {
    if (
      inspectedNode !== null &&
      selectedDocument !== null &&
      inspectedNode.nodeAggregateId !== selectedDocument.nodeAggregateId
    ) {
      inspectNode(selectedDocument)
      return true
    }
    const next = closeFloating(panels, isPinned)
    if (next === panels) return false
    updatePanels(() => next)
    return true
  }

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

  const closeLeftPanel = (panel: string) =>
    updatePanels((current) => closeLeft(current, panel))

  return (
    <TreeStyleContext.Provider value="alpha">
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
        <div className="relative flex min-h-0 flex-1 gap-2">
          <Rail
            modes={modes}
            mode={mode}
            onModeChange={activate}
            panels={editor ? railPanels : []}
            open={leftDefinition?.id ?? null}
            onTogglePanel={(panel) =>
              updatePanels((current) => toggleLeft(current, panel))
            }
          />
          {leftDefinition &&
            (leftDefinition.id === PAGES ? (
              <PagesPanel
                className={panelFrame('left', leftPinned)}
                pin={pinButton(PAGES)}
                onClose={() => closeLeftPanel(PAGES)}
              />
            ) : (
              <LeftPanel
                key={leftDefinition.id}
                className={panelFrame('left', leftPinned)}
                definition={leftDefinition}
                pin={pinButton(leftDefinition.id)}
                onClose={() => closeLeftPanel(leftDefinition.id)}
              />
            ))}
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
              {editor && (
                <ActionBar
                  onOpenMode={activate}
                  insets={{
                    left:
                      leftDefinition && !leftPinned
                        ? FLOAT_INSET + LEFT_WIDTH - CARD_INSET
                        : 0,
                    right:
                      propertiesOpen && !propertiesPinned
                        ? FLOAT_INSET + RIGHT_WIDTH - CARD_INSET
                        : 0,
                  }}
                  propertiesOpen={propertiesOpen}
                  onToggleProperties={() =>
                    updatePanels((current) =>
                      setProperties(current, !current.properties),
                    )
                  }
                  onEscape={escape}
                  onHistoryApplied={onReload}
                  onReveal={onReveal}
                />
              )}
            </div>
          </main>
          {propertiesOpen && (
            <PropertiesPanel
              className={panelFrame('right', propertiesPinned)}
              pin={pinButton(PROPERTIES)}
              showBranchMap={panels.left !== 'outline'}
              onShowOutline={() =>
                updatePanels((current) => openLeft(current, 'outline'))
              }
              onClose={() =>
                updatePanels((current) => setProperties(current, false))
              }
            />
          )}
        </div>
      </div>
    </TreeStyleContext.Provider>
  )
}

/**
 * A panel's frame: docked beside the preview when pinned, else floating
 * over the preview card's edge - the row's left edge is the rail's (44px
 * and an 8px gap), its right edge the card's.
 */
function panelFrame(side: 'left' | 'right', pinned: boolean): string {
  return cn(
    'flex shrink-0 flex-col overflow-hidden rounded-shell-surface bg-shell-surface',
    side === 'left' ? 'w-70' : 'w-75',
    pinned
      ? 'border border-shell-border'
      : cn(
          'absolute top-3.5 bottom-3.5 z-20 border border-shell-tooltip-border shadow-shell-panel',
          side === 'left' ? 'left-[66px]' : 'right-3.5',
        ),
  )
}

function LeftPanel({
  definition,
  pin,
  onClose,
  className,
}: {
  definition: PanelDefinition
  pin: React.ReactNode
  onClose: () => void
  className: string
}) {
  const { selectedDocument } = useStudio()
  return (
    <aside aria-label={panelTitle(definition)} className={className}>
      <PanelHeader
        title={panelTitle(definition)}
        subtitle={selectedDocument?.label}
        pin={pin}
        onClose={onClose}
      />
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
