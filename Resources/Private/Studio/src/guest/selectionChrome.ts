import { isMinimalChrome } from './chrome'

export const SELECTION_ID = 'neos-studio-selection-box'
const HOVER_ID = 'neos-studio-hover-box'
export const TAB_ID = 'neos-studio-selection-tab'
const GHOST_ID = 'neos-studio-drag-ghost'
export const DRAG_SOURCE_CLASS = 'neos-studio-drag-source'

/** Space between the element and the inside of its outline. */
const OUTLINE_GAP = 4
const SELECTION_WIDTH = 2
const HOVER_WIDTH = 1
const TAB_HEIGHT = 24

const ACCENT = '#00adee'
const FONT = `"Noto Sans", system-ui, -apple-system, sans-serif`

const GRIP = (color: string) =>
  `<svg width="8" height="12" viewBox="0 0 8 12" aria-hidden="true">${[2, 6, 10]
    .map(
      (y) =>
        `<circle cx="2" cy="${y}" r="1.2" fill="${color}"/><circle cx="6" cy="${y}" r="1.2" fill="${color}"/>`,
    )
    .join('')}</svg>`

export function selectionChromeStyles(minimal: string): string {
  return `
    #${SELECTION_ID}, #${HOVER_ID} {
      position: fixed;
      z-index: 2147483644;
      display: none;
      box-sizing: border-box;
      pointer-events: none;
    }
    #${SELECTION_ID} {
      border: ${SELECTION_WIDTH}px solid ${ACCENT};
      border-radius: 0 4px 4px 4px;
    }
    #${SELECTION_ID}[data-tab='below'] {
      border-radius: 4px 4px 4px 0;
    }
    #${SELECTION_ID}[data-tab='none'] {
      border-radius: 4px;
    }
    #${SELECTION_ID}[data-state='hidden'] {
      border-style: dashed;
      border-color: rgba(0, 173, 238, 0.7);
    }
    #${SELECTION_ID}[data-state='dragging'] {
      border: 1.5px dashed rgba(0, 173, 238, 0.6);
      border-radius: 4px;
    }
    #${HOVER_ID} {
      border: ${HOVER_WIDTH}px solid rgba(0, 173, 238, 0.6);
      border-radius: 4px;
    }
    ${minimal} .${DRAG_SOURCE_CLASS} {
      opacity: 0.35 !important;
    }
    #${TAB_ID} {
      position: fixed;
      /* Below the richtext toolbars (2147483647). */
      z-index: 2147483646;
      display: none;
      align-items: center;
      gap: 6px;
      box-sizing: border-box;
      height: ${TAB_HEIGHT}px;
      max-width: 240px;
      padding: 0 9px 0 6px;
      border-radius: 6px 6px 0 0;
      background: ${ACCENT};
      color: #062a38;
      font: 600 12px/16px ${FONT};
      white-space: nowrap;
      cursor: grab;
      user-select: none;
      -webkit-user-select: none;
      touch-action: none;
    }
    #${TAB_ID}[data-place='below'] {
      border-radius: 0 0 6px 6px;
    }
    /* The text tools' strip continues the tab (textTools.ts). */
    #${TAB_ID}[data-attached] {
      border-radius: 6px 0 0 0;
      box-shadow: 0 6px 18px #00000040;
    }
    #${TAB_ID}[data-attached][data-place='below'] {
      border-radius: 0 0 0 6px;
    }
    #${TAB_ID} > span {
      overflow: hidden;
      text-overflow: ellipsis;
    }
    #${TAB_ID} > svg, #${GHOST_ID} > svg {
      flex: none;
    }
    #${GHOST_ID} {
      position: fixed;
      z-index: 2147483647;
      display: none;
      align-items: center;
      gap: 8px;
      box-sizing: border-box;
      height: 32px;
      max-width: 320px;
      padding: 0 12px 0 8px;
      border: 1px solid ${ACCENT};
      border-radius: 8px;
      background: #1a1a1a;
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4);
      color: #ededed;
      font: 500 13px/16px ${FONT};
      white-space: nowrap;
      rotate: -2deg;
      transform-origin: 0 0;
      pointer-events: none;
    }
    #${GHOST_ID} > i {
      flex: none;
      width: 12px;
      height: 12px;
      background-color: #7fd6f7;
      mask: var(--neos-studio-icon) center / contain no-repeat;
    }
    #${GHOST_ID} > span {
      overflow: hidden;
      text-overflow: ellipsis;
    }
    html.neos-studio-dragging, html.neos-studio-dragging * {
      cursor: grabbing !important;
    }
  `
}

function box(id: string): HTMLElement {
  let element = document.getElementById(id)
  if (!element) {
    element = document.createElement('div')
    element.id = id
    element.setAttribute('aria-hidden', 'true')
    document.body.appendChild(element)
  }
  return element
}

function placeAround(
  target: HTMLElement,
  element: HTMLElement,
  width: number,
): DOMRect {
  const rect = target.getBoundingClientRect()
  const inset = OUTLINE_GAP + width
  // Full-width elements would push their outline out of the frame.
  const left = Math.max(rect.left - inset, 0)
  const right = Math.min(rect.right + inset, window.innerWidth)
  const top = rect.top - inset
  const bottom = rect.bottom + inset
  element.style.display = 'block'
  element.style.left = `${left}px`
  element.style.top = `${top}px`
  element.style.width = `${right - left}px`
  element.style.height = `${bottom - top}px`
  return new DOMRect(left, top, right - left, bottom - top)
}

/** The tab a drag starts from; created once, wired by the caller. */
export function selectionTab(
  onPointerDown: (event: PointerEvent) => void,
): HTMLElement {
  let tab = document.getElementById(TAB_ID)
  if (!tab) {
    tab = document.createElement('div')
    tab.id = TAB_ID
    tab.innerHTML = `${GRIP('#062A38')}<span></span>`
    tab.addEventListener('pointerdown', onPointerDown)
    document.body.appendChild(tab)
  }
  return tab
}

export interface SelectionChromeState {
  selected: HTMLElement | null
  hovered: HTMLElement | null
  /** The selected element is hidden (dashed outline). */
  hidden: boolean
  /** Type label for the tab; null draws no tab (not movable). */
  tabLabel: string | null
  dragging: boolean
}

/** Draw the minimal chrome's selection, its tab and the hover outline. */
export function drawSelectionChrome(
  state: SelectionChromeState,
  tab: HTMLElement,
): void {
  const selectionBox = box(SELECTION_ID)
  const hoverBox = box(HOVER_ID)
  const minimal = isMinimalChrome()
  const selected =
    minimal && state.selected?.isConnected ? state.selected : null
  const hovered =
    minimal &&
    !state.dragging &&
    state.hovered?.isConnected &&
    state.hovered !== selected
      ? state.hovered
      : null

  if (hovered) placeAround(hovered, hoverBox, HOVER_WIDTH)
  else hoverBox.style.display = 'none'

  if (!selected) {
    selectionBox.style.display = 'none'
    tab.style.display = 'none'
    return
  }
  const outline = placeAround(selected, selectionBox, SELECTION_WIDTH)
  selectionBox.dataset.state = state.dragging
    ? 'dragging'
    : state.hidden
      ? 'hidden'
      : 'selected'

  const showTab =
    state.tabLabel !== null && !state.dragging && outline.bottom > TAB_HEIGHT
  if (!showTab) {
    selectionBox.dataset.tab = 'none'
    tab.style.display = 'none'
    return
  }
  const label = tab.querySelector('span')
  if (label && label.textContent !== state.tabLabel)
    label.textContent = state.tabLabel
  // No room above: the tab moves to the outline's bottom edge, so it never
  // covers the text being edited.
  const place = outline.top < TAB_HEIGHT ? 'below' : 'above'
  selectionBox.dataset.tab = place
  tab.dataset.place = place
  tab.style.display = 'flex'
  tab.style.left = `${outline.left}px`
  tab.style.top =
    place === 'below' ? `${outline.bottom}px` : `${outline.top - TAB_HEIGHT}px`
}

/** The chip that follows the pointer while an element is dragged. */
export function showDragGhost(
  x: number,
  y: number,
  content: { label: string; icon: string | null },
): void {
  let ghost = document.getElementById(GHOST_ID)
  if (!ghost) {
    ghost = document.createElement('div')
    ghost.id = GHOST_ID
    ghost.setAttribute('aria-hidden', 'true')
    document.body.appendChild(ghost)
  }
  const key = `${content.label}\n${content.icon ?? ''}`
  if (ghost.dataset.content !== key) {
    ghost.dataset.content = key
    ghost.innerHTML = GRIP('#9A9A9A')
    if (content.icon !== null) {
      const icon = document.createElement('i')
      icon.style.setProperty('--neos-studio-icon', `url("${content.icon}")`)
      ghost.appendChild(icon)
    }
    const text = document.createElement('span')
    text.textContent = content.label
    ghost.appendChild(text)
  }
  ghost.style.display = 'flex'
  ghost.style.left = `${x + 8}px`
  ghost.style.top = `${y - 8}px`
}

export function hideDragGhost(): void {
  const ghost = document.getElementById(GHOST_ID)
  if (ghost) ghost.style.display = 'none'
}
