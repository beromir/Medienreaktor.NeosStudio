const HIGHLIGHT_NAME = 'neos-studio-match'

/** The ::highlight() rule for highlightText - part of the guest's styles. */
export const textHighlightStyles = `
  ::highlight(${HIGHLIGHT_NAME}) {
    background-color: rgba(0, 173, 238, 0.45);
    color: inherit;
  }
`

/** The occurrences of the term (else of its words) in the element's text. */
function ranges(element: HTMLElement, term: string): Range[] {
  const texts: Text[] = []
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT)
  for (let node = walker.nextNode(); node; node = walker.nextNode())
    texts.push(node as Text)
  const find = (needles: string[]) =>
    texts.flatMap((text) => {
      const haystack = text.data.toLowerCase()
      return needles.flatMap((needle) => {
        const found: Range[] = []
        let at = haystack.indexOf(needle)
        while (at !== -1) {
          const range = document.createRange()
          range.setStart(text, at)
          range.setEnd(text, at + needle.length)
          found.push(range)
          at = haystack.indexOf(needle, at + needle.length)
        }
        return found
      })
    })
  const whole = term.trim().toLowerCase()
  if (whole === '') return []
  const exact = find([whole])
  if (exact.length > 0) return exact
  return find(whole.split(/\s+/).filter((word) => word.length > 1))
}

let clearTimer: number | undefined

/**
 * Mark the term in the element for a while. The CSS Custom Highlight API
 * leaves the page's DOM alone - inline editors and their undo stay
 * untouched; browsers without it show the element's pulse alone.
 */
export function highlightText(
  element: HTMLElement,
  term: string,
  durationMs: number,
): void {
  if (typeof CSS === 'undefined' || !('highlights' in CSS)) return
  window.clearTimeout(clearTimer)
  const found = ranges(element, term)
  if (found.length === 0) {
    CSS.highlights.delete(HIGHLIGHT_NAME)
    return
  }
  CSS.highlights.set(HIGHLIGHT_NAME, new Highlight(...found))
  clearTimer = window.setTimeout(
    () => CSS.highlights.delete(HIGHLIGHT_NAME),
    durationMs,
  )
}
