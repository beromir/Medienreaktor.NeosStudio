/*
 * The alpha layout's icon set (R41-R45): chevrons 10px, type icons 12px,
 * actions 14px, one 1.3 stroke with round caps and joins. Plain SVG markup,
 * so the shell's React icons and the preview's text tools draw the same
 * shapes; everything paints in currentColor.
 */

const STROKE =
  'fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"'

export type ChevronDirection = 'down' | 'right' | 'up'

const CHEVRONS: Record<ChevronDirection, string> = {
  down: 'M2.5 3.75L5 6.25l2.5-2.5',
  right: 'M3.75 2.5L6.25 5l-2.5 2.5',
  up: 'M2.5 6.25L5 3.75l2.5 2.5',
}

export const TYPE_ICONS = {
  home: `<path d="M1.5 5.5L6 1.75l4.5 3.75v5h-9z" ${STROKE}/>`,
  page: `<path d="M2.5 1.5h4.5l2.5 2.5v6.5h-7z" ${STROKE}/>`,
  area: `<rect x="1.5" y="2.5" width="9" height="7" rx="1.5" ${STROKE}/>`,
  columns: `<rect x="1.5" y="2" width="9" height="8" rx="1.5" ${STROKE}/><path d="M6 2v8" ${STROKE}/>`,
  headline: `<path d="M2.5 2v8M9.5 2v8M2.5 6h7" ${STROKE}/>`,
  text: `<path d="M2 3h8M2 6h8M2 9h5" ${STROKE}/>`,
  button: `<rect x="1.5" y="4" width="9" height="4" rx="2" ${STROKE}/>`,
} as const

export type TypeIconName = keyof typeof TYPE_ICONS

const dot = (cx: number, cy: number, r = 1.25) =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="currentColor"/>`

export const ACTION_ICONS = {
  search: `<circle cx="6" cy="6" r="4" ${STROKE}/><path d="M9 9l3.5 3.5" ${STROKE}/>`,
  plus: `<path d="M7 2.5v9M2.5 7h9" ${STROKE}/>`,
  pin: `<path d="M8.6 1.6l3.8 3.8-1.5.8-2.2 2.2.3 2.5-1 1L2.1 6l1-1 2.5.3 2.2-2.2z" ${STROKE}/><path d="M4.7 9.3L1.8 12.2" ${STROKE}/>`,
  pinned: `<path d="M8.6 1.6l3.8 3.8-1.5.8-2.2 2.2.3 2.5-1 1L2.1 6l1-1 2.5.3 2.2-2.2z" ${STROKE} fill="currentColor"/><path d="M4.7 9.3L1.8 12.2" ${STROKE}/>`,
  close: `<path d="M3.5 3.5l7 7M10.5 3.5l-7 7" ${STROKE}/>`,
  collapseAll: `<path d="M4.5 2.5L7 5l2.5-2.5M4.5 11.5L7 9l2.5 2.5" ${STROKE}/>`,
  eye: `<path d="M1.5 7S3.8 3 7 3s5.5 4 5.5 4-2.3 4-5.5 4-5.5-4-5.5-4z" ${STROKE}/><circle cx="7" cy="7" r="1.6" ${STROKE}/>`,
  eyeOff: `<path d="M1.5 7S3.8 3 7 3s5.5 4 5.5 4-2.3 4-5.5 4-5.5-4-5.5-4z" ${STROKE}/><circle cx="7" cy="7" r="1.6" ${STROKE}/><path d="M2.5 12L11.5 2" ${STROKE}/>`,
  more: `${dot(3, 7)}${dot(7, 7)}${dot(11, 7)}`,
  pencil: `<path d="M9.2 2.3l2.5 2.5-6.9 6.9H2.3V9.2z" ${STROKE}/><path d="M7.7 3.8l2.5 2.5" ${STROKE}/>`,
  // Drawn on a 24-unit grid; 2.2 there is the set's 1.3 at 14px.
  gear: `<g transform="scale(0.5833)" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></g>`,
  sliders: `<path d="M2 4h10M2 10h10" ${STROKE}/><circle cx="5" cy="4" r="1.5" ${STROKE} fill="var(--knob, #1a1a1a)"/><circle cx="9" cy="10" r="1.5" ${STROKE} fill="var(--knob, #1a1a1a)"/>`,
  bold: `<path d="M4 2.5h3.75a2.25 2.25 0 010 4.5H4zM4 7h4.25a2.25 2.25 0 010 4.5H4z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>`,
  italic: `<path d="M8.5 2.5L5.5 11.5M6 2.5h5M3 11.5h5" ${STROKE}/>`,
  link: `<path d="M6 8a2.5 2.5 0 003.5 0l2-2a2.5 2.5 0 00-3.5-3.5l-.6.6M8 6a2.5 2.5 0 00-3.5 0l-2 2A2.5 2.5 0 006 11.5l.6-.6" ${STROKE}/>`,
  bulletList: `${dot(2.75, 3.5, 1)}${dot(2.75, 7, 1)}${dot(2.75, 10.5, 1)}<path d="M5.5 3.5h6M5.5 7h6M5.5 10.5h6" ${STROKE}/>`,
  orderedList: `<path d="M5.5 3.5h6M5.5 7h6M5.5 10.5h6" ${STROKE}/><path d="M2 2.5h1v2.5M2 5h2M2 9h1.75L2 11.5h1.75" ${STROKE}/>`,
  alignLeft: `<path d="M2 3.5h10M2 7h6.5M2 10.5h8" ${STROKE}/>`,
  alignCenter: `<path d="M2 3.5h10M3.75 7h6.5M3 10.5h8" ${STROKE}/>`,
  alignRight: `<path d="M2 3.5h10M5.5 7H12M4 10.5h8" ${STROKE}/>`,
  alignJustify: `<path d="M2 3.5h10M2 7h10M2 10.5h10" ${STROKE}/>`,
} as const

export type ActionIconName = keyof typeof ACTION_ICONS

const svg = (size: number, body: string) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true">${body}</svg>`

export function chevronSvg(direction: ChevronDirection = 'down'): string {
  return svg(10, `<path d="${CHEVRONS[direction]}" ${STROKE}/>`)
}

export function chevronPath(direction: ChevronDirection): string {
  return CHEVRONS[direction]
}

export function typeIconSvg(name: TypeIconName): string {
  return svg(12, TYPE_ICONS[name])
}

export function actionIconSvg(name: ActionIconName): string {
  return svg(14, ACTION_ICONS[name])
}
