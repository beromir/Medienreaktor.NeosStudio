import { post } from './bridge'

const CHROME_ATTRIBUTE = 'data-neos-studio-chrome'
const SCROLL_SPACE_ID = 'neos-studio-scroll-space'
const INSERT_LINE_ID = 'neos-studio-insert-line'
/** Breathing room between the selection and whatever covers the page. */
const REVEAL_MARGIN = 12

let bottomInset = 0
let insertPreview: {
  element: HTMLElement
  mode: 'before' | 'after' | 'inside'
} | null = null

/**
 * Styles of the minimal chrome (the alpha layout): the shell's own
 * affordances inside the page step back for the action bar outside it.
 */
export function chromeStyles(selectors: {
  hiddenInMinimal: string
  wrapper: string
  hoverClass: string
  selectedClass: string
}): string {
  const minimal = `html[${CHROME_ATTRIBUTE}='minimal']`
  return `
    ${minimal} :is(${selectors.hiddenInMinimal}) {
      display: none !important;
    }
    ${minimal} [${selectors.wrapper}].${selectors.selectedClass} {
      outline: 1.5px solid rgba(0, 173, 238, 0.9);
    }
    ${minimal} [${selectors.wrapper}].${selectors.hoverClass}:not(.${selectors.selectedClass}) {
      outline-width: 1px;
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
  if (grew) keepVisible(selected)
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

export function positionInsertLine(): void {
  const line = insertLine()
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
