/**
 * The panels around the preview: one panel at a time in the docked left
 * column, and the Properties panel alone on the right, floating over the
 * preview unless the editor pinned it. The left panel and the pin are user
 * preferences, the Properties panel's open state a per-browser one.
 */
export interface Panels {
  /** The left column's panel, null when it is closed. */
  left: string | null
  properties: boolean
}

export const NO_PANELS: Panels = { left: null, properties: false }

/** Pages and Outline in one panel, the rail's first button. */
export const STRUCTURE = 'shellAlpha:structure'

/** The panels the structure panel took over (stored states, reveals). */
const IN_STRUCTURE = new Set(['shellAlpha:pages', 'outline'])

/** The left panel that shows a panel: the structure panel for its parts. */
export function leftPanelFor(panel: string): string {
  return IN_STRUCTURE.has(panel) ? STRUCTURE : panel
}

/** Opening a left panel replaces the open one. */
export function openLeft(panels: Panels, panel: string): Panels {
  const left = leftPanelFor(panel)
  return panels.left === left ? panels : { ...panels, left }
}

/** A rail button: opens its panel, or closes it when open. */
export function toggleLeft(panels: Panels, panel: string): Panels {
  const left = leftPanelFor(panel)
  return { ...panels, left: panels.left === left ? null : left }
}

export function closeLeft(panels: Panels, panel: string): Panels {
  return panels.left === leftPanelFor(panel)
    ? { ...panels, left: null }
    : panels
}

export function setProperties(panels: Panels, open: boolean): Panels {
  return panels.properties === open ? panels : { ...panels, properties: open }
}

/**
 * Esc: closes the Properties panel while it floats. The docked column and a
 * pinned Properties panel stay; unchanged when nothing floats.
 */
export function closeFloating(
  panels: Panels,
  propertiesPinned: boolean,
): Panels {
  return panels.properties && !propertiesPinned
    ? { ...panels, properties: false }
    : panels
}

/** The Properties panel's id, for its pin. */
export const PROPERTIES = 'shellAlpha:properties'

/** The pinned panels with the panel's pin flipped. */
export function togglePinned(pinned: readonly string[], panel: string) {
  return pinned.includes(panel)
    ? pinned.filter((candidate) => candidate !== panel)
    : [...pinned, panel]
}

/** A stored left panel, null when it no longer exists. */
export function restoreLeft(
  value: unknown,
  exists: (panel: string) => boolean,
): string | null {
  if (typeof value !== 'string') return null
  const left = leftPanelFor(value)
  return left === STRUCTURE || exists(left) ? left : null
}

/** A stored preference, cut down to a list of panel ids. */
export function restorePinned(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((panel): panel is string => typeof panel === 'string')
    : []
}

/** The structure panel's sections, as the editor left them. */
export interface StructureLayout {
  /** The Pages section's list height, px. */
  pagesHeight: number
  pagesFolded: boolean
  outlineFolded: boolean
}

/** Pages rows: 28px with 2px gaps. */
const PAGE_ROW = 28
const PAGE_ROW_GAP = 2

/** The height of n Pages rows. */
export function pageRowsHeight(rows: number): number {
  return rows * PAGE_ROW + Math.max(rows - 1, 0) * PAGE_ROW_GAP
}

/** Pages opens at five rows. */
export const DEFAULT_STRUCTURE: StructureLayout = {
  pagesHeight: pageRowsHeight(5),
  pagesFolded: false,
  outlineFolded: false,
}

/** The smallest Pages list: one row. */
export const MIN_PAGES_HEIGHT = PAGE_ROW

/**
 * The Pages list's height for a drag of the handle: at least one row, and
 * never more than leaves the Outline its minimum.
 */
export function clampPagesHeight(height: number, max: number): number {
  return Math.round(
    Math.max(
      MIN_PAGES_HEIGHT,
      Math.min(height, Math.max(max, MIN_PAGES_HEIGHT)),
    ),
  )
}

/** A stored structure layout, cut down to what is valid. */
export function restoreStructure(value: unknown): StructureLayout {
  if (typeof value !== 'object' || value === null) return DEFAULT_STRUCTURE
  const { pagesHeight, pagesFolded, outlineFolded } =
    value as Partial<StructureLayout>
  return {
    pagesHeight:
      typeof pagesHeight === 'number' && Number.isFinite(pagesHeight)
        ? Math.max(MIN_PAGES_HEIGHT, Math.round(pagesHeight))
        : DEFAULT_STRUCTURE.pagesHeight,
    pagesFolded: pagesFolded === true,
    outlineFolded: outlineFolded === true,
  }
}
