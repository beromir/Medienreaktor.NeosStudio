import * as React from 'react'
import type { Node } from '@/api/neos/schema'
import { useStudio } from '@/app/StudioContext'
import type { EditingContext } from '@/app/useEditingContext'
import type { RevealLocation } from '@/app/useSelection'
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
import { useLatestRef } from '@/hooks/use-latest-ref'
import { ActionBar } from './ActionBar'
import {
  closeFloating,
  closeLeft,
  openLeft,
  type Panels,
  PROPERTIES,
  restoreLeft,
  setProperties,
  STRUCTURE,
  toggleLeft,
  togglePinned,
} from './dock'
import {
  LEFT_PANEL_PREFERENCE,
  usePinnedPanels,
  useUserPreference,
} from './preferences'
import { PanelHeader, PinButton } from './primitives'
import { PropertiesPanel } from './PropertiesPanel'
import { SearchDialog } from './SearchDialog'
import { Rail } from './Rail'
import { StructurePanel } from './StructurePanel'
import { DEVICE_WIDTHS, type Device, TopBar } from './TopBar'

const EDITOR = 'visual-editor'
const PROPERTIES_KEY = 'neos-studio.alpha.properties'
const DEVICE_KEY = 'neos-studio.alpha.device'
/** Panels with a place of their own in this layout, not in the rail. */
const PLACED_ELSEWHERE = new Set(['documents', 'inspector', 'outline'])
const EDITOR_TOOLS = ['clipboard', 'trash']
/** Pages and Outline: the shell's own panel, first in the rail. */
const STRUCTURE_DEFINITION: PanelDefinition = {
  id: STRUCTURE,
  title: () => t('shellAlpha.structure', 'Pages and outline'),
  component: () => null,
  defaultPlacement: { kind: 'dock', region: 'sidebar' },
}

/*
 * A floating Properties panel lies over the preview card, 14px inside its
 * edge. The action bar centres in the rest: its stack sits in the card's
 * content box, 7px (border and padding) inside the card.
 */
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
  onReveal: (location: RevealLocation) => void
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
      STRUCTURE_DEFINITION,
      ...tools,
      ...(second.length ? [null] : []),
      ...second,
    ]
  }, [definitions])

  const restoreLeftPanel = React.useCallback(
    (value: unknown) =>
      restoreLeft(value, (panel) =>
        panelRegistry.getAll().some((definition) => definition.id === panel),
      ),
    [],
  )
  // The column is the user's; Properties opens per browser.
  const [left, setLeft] = useUserPreference(
    LEFT_PANEL_PREFERENCE,
    restoreLeftPanel,
  )
  const [properties, setPropertiesOpen] = usePersistedState<boolean>(
    PROPERTIES_KEY,
    false,
  )
  const panels: Panels = { left, properties: properties === true }
  const panelsRef = useLatestRef(panels)
  const updatePanels = React.useCallback(
    (change: (panels: Panels) => Panels) => {
      const current = panelsRef.current
      const next = change(current)
      if (next.left !== current.left) setLeft(next.left)
      if (next.properties !== current.properties)
        setPropertiesOpen(next.properties)
    },
    [panelsRef, setLeft, setPropertiesOpen],
  )
  const [pinnedPanels, setPinnedPanels] = usePinnedPanels()
  const propertiesPinnedPreference = pinnedPanels.includes(PROPERTIES)

  const editor = mode === EDITOR
  const leftDefinition =
    !editor || panels.left === null
      ? null
      : panels.left === STRUCTURE
        ? STRUCTURE_DEFINITION
        : (definitions.find((definition) => definition.id === panels.left) ??
          null)
  const propertiesOpen = editor && panels.properties
  const propertiesPinned = propertiesOpen && propertiesPinnedPreference

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
          (PLACED_ELSEWHERE.has(definition.id) && definition.id !== 'outline')
        )
          return
        activate(EDITOR)
        updatePanels((current) => openLeft(current, panel))
      }),
    [activate, updatePanels],
  )

  const [searchOpen, setSearchOpen] = React.useState(false)

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
    const next = closeFloating(panels, propertiesPinnedPreference)
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
            (leftDefinition.id === STRUCTURE ? (
              <StructurePanel
                className={LEFT_FRAME}
                onClose={() => closeLeftPanel(STRUCTURE)}
              />
            ) : (
              <LeftPanel
                key={leftDefinition.id}
                className={LEFT_FRAME}
                definition={leftDefinition}
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
                  searchOpen={searchOpen}
                  onSearch={() => setSearchOpen(true)}
                  onOpenMode={activate}
                  insets={{
                    left: 0,
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
              className={propertiesFrame(propertiesPinned)}
              pin={
                <PinButton
                  pinned={propertiesPinned}
                  onClick={() =>
                    setPinnedPanels(togglePinned(pinnedPanels, PROPERTIES))
                  }
                />
              }
              onClose={() =>
                updatePanels((current) => setProperties(current, false))
              }
            />
          )}
        </div>
      </div>
      <SearchDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        editing={editing}
        onReveal={onReveal}
        onOpenMode={activate}
        onChangeDimension={onChangeDimension}
      />
    </TreeStyleContext.Provider>
  )
}

/**
 * The left column: docked between rail and preview, the preview card's
 * surface. One width for every left panel, so the site reflows only when
 * the column opens or closes.
 */
const LEFT_FRAME =
  'flex w-70 shrink-0 flex-col overflow-hidden rounded-shell-surface border border-shell-border bg-shell-surface'

/**
 * The Properties panel's frame: docked beside the preview when pinned,
 * else floating over the preview card's right edge.
 */
function propertiesFrame(pinned: boolean): string {
  return cn(
    'flex w-75 shrink-0 flex-col overflow-hidden rounded-shell-surface bg-shell-surface',
    pinned
      ? 'border border-shell-border'
      : 'absolute top-3.5 right-3.5 bottom-3.5 z-20 border border-shell-tooltip-border shadow-shell-panel',
  )
}

function LeftPanel({
  definition,
  onClose,
  className,
}: {
  definition: PanelDefinition
  onClose: () => void
  className: string
}) {
  const { selectedDocument } = useStudio()
  return (
    <aside aria-label={panelTitle(definition)} className={className}>
      <PanelHeader
        title={panelTitle(definition)}
        subtitle={selectedDocument?.label}
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
