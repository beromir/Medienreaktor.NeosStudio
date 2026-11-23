/**
 * The docked panels between rail and preview: one at a time, unless one is
 * pinned - then the next opens beside it and further ones replace that
 * second panel. Two at most, one pin; panels keep their place when the pin
 * moves, the preview gets narrower instead.
 */
export interface Dock {
  /** Left to right. */
  open: string[]
  pinned: string | null
}

export const EMPTY_DOCK: Dock = { open: [], pinned: null }

export function openDocked(dock: Dock, panel: string): Dock {
  if (dock.open.includes(panel)) return dock
  const pinned =
    dock.pinned !== null && dock.open.includes(dock.pinned) ? dock.pinned : null
  if (pinned === null) return { open: [panel], pinned: null }
  const other = dock.open.find((candidate) => candidate !== pinned)
  return {
    open:
      other === undefined
        ? [pinned, panel]
        : dock.open.map((candidate) =>
            candidate === other ? panel : candidate,
          ),
    pinned,
  }
}

export function closeDocked(dock: Dock, panel: string): Dock {
  return {
    open: dock.open.filter((candidate) => candidate !== panel),
    pinned: dock.pinned === panel ? null : dock.pinned,
  }
}

/** A rail button: opens its panel, or closes it when open. */
export function toggleDocked(dock: Dock, panel: string): Dock {
  return dock.open.includes(panel)
    ? closeDocked(dock, panel)
    : openDocked(dock, panel)
}

/** The pin of an open panel: pins it (moving the pin) or unpins it. */
export function togglePin(dock: Dock, panel: string): Dock {
  if (!dock.open.includes(panel)) return dock
  return { ...dock, pinned: dock.pinned === panel ? null : panel }
}

/** Opens the panel pinned - the tray's "Keep open". */
export function keepOpen(dock: Dock, panel: string): Dock {
  if (dock.open.includes(panel)) return { ...dock, pinned: panel }
  const kept =
    dock.pinned !== null && dock.open.includes(dock.pinned)
      ? [dock.pinned]
      : dock.open.slice(0, 1)
  return { open: [panel, ...kept], pinned: panel }
}

/** A stored dock, cut down to what is valid. */
export function restoreDock(
  value: unknown,
  exists: (panel: string) => boolean,
): Dock {
  if (typeof value !== 'object' || value === null) return EMPTY_DOCK
  const { open, pinned } = value as Partial<Dock>
  const panels = Array.isArray(open)
    ? open
        .filter(
          (panel): panel is string =>
            typeof panel === 'string' && exists(panel),
        )
        .slice(0, 2)
    : []
  const pin =
    typeof pinned === 'string' && panels.includes(pinned) ? pinned : null
  return { open: pin === null ? panels.slice(0, 1) : panels, pinned: pin }
}
