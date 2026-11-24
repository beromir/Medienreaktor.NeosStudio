import { post } from './bridge'

const CHROME_ATTRIBUTE = 'data-neos-studio-chrome'
export const MINIMAL_SELECTOR = `html[${CHROME_ATTRIBUTE}='minimal']`
const SCROLL_SPACE_ID = 'neos-studio-scroll-space'
const INSERT_LINE_ID = 'neos-studio-insert-line'
const INSERT_LABEL_ID = 'neos-studio-insert-label'
/** Breathing room between the selection and whatever covers the page. */
const REVEAL_MARGIN = 12

let bottomInset = 0
/** The selection was made in the page: the page keeps its scroll position. */
let selectedInPage = false
let insertPreview: {
  element: HTMLElement
  mode: 'before' | 'after' | 'inside'
} | null = null

/** Where a dragged element would land, in viewport px. */
export interface DropLine {
  x: number
  y: number
  length: number
  vertical: boolean
  label: DropLabel
}

/** "After **Button** in Teaser area": the relation, the sibling, the place. */
export interface DropLabel {
  relation: string
  sibling: string | null
  place: string | null
}

let dropLine: DropLine | null = null

export function isMinimalChrome(): boolean {
  return document.documentElement.getAttribute(CHROME_ATTRIBUTE) === 'minimal'
}

/** px the shell covers at the preview's bottom right now. */
export function coveredBottom(): number {
  return bottomInset
}

/**
 * Styles of the minimal chrome (the alpha layout): the shell's own
 * affordances inside the page step back for the action bar outside it.
 */
export function chromeStyles(selectors: {
  hiddenInMinimal: string
  wrapper: string
  hoverClass: string
  selectedClass: string
  hidden: string
  droppable: string
  /** The add button only empty collections carry. */
  collectionAdd: string
}): string {
  const minimal = MINIMAL_SELECTOR
  return `
    ${minimal} :is(${selectors.hiddenInMinimal}) {
      display: none !important;
    }
    /* The selection and hover outlines are drawn as boxes of their own
       (selectionChrome.ts): an outline cannot round only three corners. */
    ${minimal} [${selectors.wrapper}]:is(.${selectors.selectedClass}, .${selectors.hoverClass}) {
      outline: none !important;
    }
    ${minimal} [${selectors.wrapper}][${selectors.hidden}] {
      opacity: 0.45;
    }
    /* Only the insert line marks where a drop lands. */
    ${minimal} [${selectors.wrapper}]:is(.${selectors.droppable}) {
      outline: none !important;
      background-color: transparent !important;
    }
    /* Without its add button an empty collection may have no width left to
       drop into. */
    ${minimal} [${selectors.wrapper}].${selectors.droppable}:has(> .${selectors.collectionAdd}) {
      min-width: min(100%, 240px);
      min-height: 32px;
    }
    #${INSERT_LINE_ID} {
      position: fixed;
      z-index: 2147483645;
      display: none;
      align-items: center;
      gap: 8px;
      height: 8px;
      pointer-events: none;
    }
    #${INSERT_LINE_ID}::before {
      content: '';
      flex: none;
      box-sizing: border-box;
      width: 8px;
      height: 8px;
      border: 2px solid #00adee;
      border-radius: 4px;
      background: #fff;
    }
    #${INSERT_LINE_ID}::after {
      content: '';
      flex: 1;
      height: 2px;
      border-radius: 1px;
      background: #00adee;
    }
    #${INSERT_LINE_ID}[data-vertical] {
      flex-direction: column;
      width: 8px;
      height: auto;
    }
    #${INSERT_LINE_ID}[data-vertical]::after {
      width: 2px;
      height: auto;
    }
    #${INSERT_LABEL_ID} {
      position: fixed;
      z-index: 2147483645;
      display: none;
      align-items: center;
      box-sizing: border-box;
      height: 22px;
      padding: 0 9px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 11px;
      background: rgba(26, 26, 26, 0.95);
      color: #ededed;
      font: 400 12px/16px "Noto Sans", system-ui, -apple-system, sans-serif;
      white-space: pre;
      pointer-events: none;
    }
    #${INSERT_LABEL_ID} b {
      font-weight: 600;
    }
    #${INSERT_LABEL_ID} span {
      color: #9a9a9a;
    }
  `
}

export function applyChrome(
  message: { minimal: boolean; scrollSpace: number; bottomInset: number },
  selected: HTMLElement | null,
): void {
  const html = document.documentElement
  if (message.minimal) html.setAttribute(CHROME_ATTRIBUTE, 'minimal')
  else html.removeAttribute(CHROME_ATTRIBUTE)

  let space = document.getElementById(SCROLL_SPACE_ID)
  if (message.scrollSpace > 0) {
    if (!space) {
      space = document.createElement('div')
      space.id = SCROLL_SPACE_ID
      space.setAttribute('aria-hidden', 'true')
    }
    // Last in body, also after content appended since the previous message.
    if (space !== document.body.lastElementChild)
      document.body.appendChild(space)
    space.style.height = `${message.scrollSpace}px`
  } else {
    space?.remove()
  }

  const grew = message.bottomInset > bottomInset
  bottomInset = message.bottomInset
  if (grew && !selectedInPage) keepVisible(selected)
}

/**
 * Where the current selection was made: a click in the page leaves the
 * scroll position alone, also when the shell then covers more of it.
 */
export function setSelectedInPage(value: boolean): void {
  selectedInPage = value
}

/** Scroll the element clear of the bottom inset, if it sits under it. */
export function keepVisible(element: HTMLElement | null): void {
  if (!element || bottomInset === 0) return
  const rect = element.getBoundingClientRect()
  const visibleBottom = window.innerHeight - bottomInset - REVEAL_MARGIN
  if (rect.bottom <= visibleBottom) return
  // A tall element shows its top rather than its bottom edge.
  const delta = Math.min(rect.bottom - visibleBottom, rect.top - REVEAL_MARGIN)
  if (delta > 0) window.scrollBy({ top: delta, behavior: 'smooth' })
}

function insertLine(): HTMLElement {
  let line = document.getElementById(INSERT_LINE_ID)
  if (!line) {
    line = document.createElement('div')
    line.id = INSERT_LINE_ID
    line.setAttribute('aria-hidden', 'true')
    document.body.appendChild(line)
  }
  return line
}

export function setInsertPreview(
  element: HTMLElement | null,
  mode: 'before' | 'after' | 'inside',
): void {
  insertPreview = element ? { element, mode } : null
  positionInsertLine()
  if (element) keepVisible(element)
}

/** Draw (or, with null, remove) the line where a drag would drop. */
export function setDropLine(line: DropLine | null): void {
  dropLine = line
  positionInsertLine()
}

function insertLabel(): HTMLElement {
  let label = document.getElementById(INSERT_LABEL_ID)
  if (!label) {
    label = document.createElement('div')
    label.id = INSERT_LABEL_ID
    label.setAttribute('aria-hidden', 'true')
    document.body.appendChild(label)
  }
  return label
}

/** Gap between the end of the line and its label. */
const LABEL_GAP = 14

function drawDropLine(line: HTMLElement, drop: DropLine): void {
  line.toggleAttribute('data-vertical', drop.vertical)
  line.style.display = 'flex'
  // The line's 8px dot centres on the drop position.
  if (drop.vertical) {
    line.style.left = `${drop.x - 4}px`
    line.style.top = `${drop.y}px`
    line.style.width = ''
    line.style.height = `${drop.length}px`
  } else {
    line.style.left = `${drop.x}px`
    line.style.top = `${drop.y - 4}px`
    line.style.width = `${drop.length}px`
    line.style.height = ''
  }
  const label = insertLabel()
  label.replaceChildren(drop.label.relation)
  if (drop.label.sibling !== null) {
    const sibling = document.createElement('b')
    sibling.textContent = ` ${drop.label.sibling}`
    label.appendChild(sibling)
  }
  if (drop.label.place !== null) {
    const place = document.createElement('span')
    place.textContent = ` ${drop.label.place}`
    label.appendChild(place)
  }
  label.style.display = 'flex'
  const { width, height } = label.getBoundingClientRect()
  let left = drop.vertical
    ? drop.x + LABEL_GAP
    : drop.x + drop.length + LABEL_GAP
  let top = drop.vertical ? drop.y : drop.y - height / 2
  // No room after the line: above its end instead.
  if (left + width > window.innerWidth - 8) {
    left = Math.max(8, (drop.vertical ? drop.x : drop.x + drop.length) - width)
    top = drop.vertical ? drop.y - height - 8 : drop.y - height - 8
  }
  label.style.left = `${left}px`
  label.style.top = `${Math.max(top, 4)}px`
}

export function positionInsertLine(): void {
  const line = insertLine()
  if (dropLine) {
    drawDropLine(line, dropLine)
    return
  }
  const label = document.getElementById(INSERT_LABEL_ID)
  if (label) label.style.display = 'none'
  line.removeAttribute('data-vertical')
  line.style.height = ''
  if (!insertPreview || !insertPreview.element.isConnected) {
    line.style.display = 'none'
    return
  }
  const rect = insertPreview.element.getBoundingClientRect()
  // Centred in the gap the selection outline leaves (offset 5px).
  const y =
    insertPreview.mode === 'before'
      ? rect.top - 9
      : insertPreview.mode === 'after'
        ? rect.bottom + 1
        : rect.bottom - 12
  line.style.display = 'flex'
  line.style.top = `${y}px`
  line.style.left = `${rect.left}px`
  line.style.width = `${rect.width}px`
}

let scrollFrame = 0

/** Tell the host the page scrolls - once per frame at most. */
export function reportScroll(): void {
  if (scrollFrame !== 0) return
  scrollFrame = requestAnimationFrame(() => {
    scrollFrame = 0
    post({ type: 'neos-studio/scrolled' })
  })
}

/** How close to the bottom edge counts as reaching for the action bar. */
const NEAR_BOTTOM_PX = 96
let pointerNearBottom = false

export function reportPointer(event: MouseEvent): void {
  const near = window.innerHeight - event.clientY < NEAR_BOTTOM_PX
  if (near === pointerNearBottom) return
  pointerNearBottom = near
  post({ type: 'neos-studio/pointer-near-bottom', near })
}

export function reportEscape(event: KeyboardEvent): void {
  if (event.key === 'Escape') post({ type: 'neos-studio/escape' })
}

export function reportPointerDown(): void {
  post({ type: 'neos-studio/pointer-down' })
}
