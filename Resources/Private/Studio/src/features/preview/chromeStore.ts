import { useSyncExternalStore } from 'react'

/**
 * What the shell around the preview wants from it, beyond the page itself:
 * the alpha layout's minimal in-page chrome, the space its action bar
 * covers, the insert line of an open Add menu, the device width. A store
 * rather than props: the Visual Editor is a registered panel and takes none.
 */
export interface PreviewChrome {
  minimal: boolean
  /** px added at the page's end, so the footer scrolls above the bar. */
  scrollSpace: number
  /** px the bar and its open tray/menu cover right now. */
  bottomInset: number
  insertPreview: {
    aggregateId: string
    mode: 'before' | 'after' | 'inside'
  } | null
  /** Preview width in px for a device preset; null = the full width. */
  deviceWidth: number | null
}

const CLASSIC: PreviewChrome = {
  minimal: false,
  scrollSpace: 0,
  bottomInset: 0,
  insertPreview: null,
  deviceWidth: null,
}

let chrome = CLASSIC
const listeners = new Set<() => void>()
const scrollListeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function usePreviewChrome(): PreviewChrome {
  return useSyncExternalStore(subscribe, () => chrome)
}

export function setPreviewChrome(patch: Partial<PreviewChrome>): void {
  const next = { ...chrome, ...patch }
  if (
    (Object.keys(next) as (keyof PreviewChrome)[]).every(
      (key) => next[key] === chrome[key],
    )
  )
    return
  chrome = next
  listeners.forEach((listener) => listener())
}

export function resetPreviewChrome(): void {
  chrome = CLASSIC
  listeners.forEach((listener) => listener())
}

/** The page in the preview scrolled (guest-reported). */
export function onPreviewScroll(listener: () => void): () => void {
  scrollListeners.add(listener)
  return () => {
    scrollListeners.delete(listener)
  }
}

export function reportPreviewScroll(): void {
  scrollListeners.forEach((listener) => listener())
}

const pointerListeners = new Set<(near: boolean) => void>()

/** The pointer neared the preview's bottom edge, or left it (guest-reported). */
export function onPreviewPointerNearBottom(
  listener: (near: boolean) => void,
): () => void {
  pointerListeners.add(listener)
  return () => {
    pointerListeners.delete(listener)
  }
}

export function reportPreviewPointerNearBottom(near: boolean): void {
  pointerListeners.forEach((listener) => listener(near))
}

const escapeListeners = new Set<() => void>()

/** Escape was pressed inside the preview (guest-reported). */
export function onPreviewEscape(listener: () => void): () => void {
  escapeListeners.add(listener)
  return () => {
    escapeListeners.delete(listener)
  }
}

export function reportPreviewEscape(): void {
  escapeListeners.forEach((listener) => listener())
}

const pointerDownListeners = new Set<() => void>()

/** A pointer went down inside the preview (guest-reported). */
export function onPreviewPointerDown(listener: () => void): () => void {
  pointerDownListeners.add(listener)
  return () => {
    pointerDownListeners.delete(listener)
  }
}

export function reportPreviewPointerDown(): void {
  pointerDownListeners.forEach((listener) => listener())
}
