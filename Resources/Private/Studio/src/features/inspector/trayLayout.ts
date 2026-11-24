import type { TraySpan } from './editors/registry'

/** A field of the tray grid, or a row of consecutive switches. */
export type TrayCell<Item> =
  | { kind: 'field'; item: Item; span: TraySpan }
  | { kind: 'switches'; items: [Item, ...Item[]] }

/**
 * The cells of a group in the settings tray (R29): consecutive switches
 * share one wrapping row, every other field spans by its editor.
 */
export function trayCells<Item>(
  items: Item[],
  isSwitch: (item: Item) => boolean,
  span: (item: Item) => TraySpan,
): TrayCell<Item>[] {
  const cells: TrayCell<Item>[] = []
  for (const item of items) {
    const previous = cells.at(-1)
    if (!isSwitch(item)) cells.push({ kind: 'field', item, span: span(item) })
    else if (previous?.kind === 'switches') previous.items.push(item)
    else cells.push({ kind: 'switches', items: [item] })
  }
  return cells
}

/** The columns of the four a group's cells need side by side. */
export function columnsNeeded<Item>(cells: TrayCell<Item>[]): number {
  return cells.reduce(
    (sum, cell) =>
      sum + (cell.kind === 'switches' || cell.span === 'row' ? 4 : cell.span),
    0,
  )
}

/**
 * Groups in tray rows: two consecutive groups that each need at most two
 * columns share a row (R29 B), every other group has a row to itself.
 */
export function trayRows<Group>(
  groups: Group[],
  columns: (group: Group) => number,
): ([Group] | [Group, Group])[] {
  const rows: ([Group] | [Group, Group])[] = []
  let pending: Group | undefined
  for (const group of groups) {
    if (pending === undefined) pending = group
    else if (columns(pending) <= 2 && columns(group) <= 2) {
      rows.push([pending, group])
      pending = undefined
    } else {
      rows.push([pending])
      pending = group
    }
  }
  if (pending !== undefined) rows.push([pending])
  return rows
}
