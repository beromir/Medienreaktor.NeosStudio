/**
 * The panels around the preview: one panel in the left column at a time and
 * the Properties panel alone on the right. Each one floats over the preview
 * unless the editor pinned it, which docks it beside the preview instead;
 * the pins are a user preference, the open panels a per-browser state.
 */
export interface Panels {
  /** The left column's panel, null when it is closed. */
  left: string | null
  properties: boolean
}

export const NO_PANELS: Panels = { left: null, properties: false }

/** Opening a left panel replaces the open one. */
export function openLeft(panels: Panels, panel: string): Panels {
  return panels.left === panel ? panels : { ...panels, left: panel }
}

/** A rail button: opens its panel, or closes it when open. */
export function toggleLeft(panels: Panels, panel: string): Panels {
  return { ...panels, left: panels.left === panel ? null : panel }
}

export function closeLeft(panels: Panels, panel: string): Panels {
  return panels.left === panel ? { ...panels, left: null } : panels
}

export function setProperties(panels: Panels, open: boolean): Panels {
  return panels.properties === open ? panels : { ...panels, properties: open }
}

/**
 * Esc: closes what floats - the Properties panel first, the left panel
 * next - and leaves pinned panels alone. Unchanged when nothing floats.
 */
export function closeFloating(
  panels: Panels,
  pinned: (panel: string) => boolean,
): Panels {
  if (panels.properties && !pinned(PROPERTIES))
    return { ...panels, properties: false }
  if (panels.left !== null && !pinned(panels.left))
    return { ...panels, left: null }
  return panels
}

/** The Properties panel's id, for its pin. */
export const PROPERTIES = 'shellAlpha:properties'

/** The pinned panels with the panel's pin flipped. */
export function togglePinned(pinned: readonly string[], panel: string) {
  return pinned.includes(panel)
    ? pinned.filter((candidate) => candidate !== panel)
    : [...pinned, panel]
}

/** A stored state, cut down to what is valid. */
export function restorePanels(
  value: unknown,
  exists: (panel: string) => boolean,
): Panels {
  if (typeof value !== 'object' || value === null) return NO_PANELS
  const { left, properties } = value as Partial<Panels>
  return {
    left: typeof left === 'string' && exists(left) ? left : null,
    properties: properties === true,
  }
}

/** A stored preference, cut down to a list of panel ids. */
export function restorePinned(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((panel): panel is string => typeof panel === 'string')
    : []
}
