import type { Asset } from '@/api/neos/schema'

/**
 * A request to show an asset in the Media mode (a search result). Buffered
 * like app/flash.ts: the Media mode mounts on its first visit, after the
 * request was raised.
 */
let pending: Asset | null = null
const listeners = new Set<() => void>()

export function requestAssetOpen(asset: Asset): void {
  pending = asset
  for (const listener of listeners) listener()
}

/** The pending request, if any - consuming it. */
export function takeAssetOpenRequest(): Asset | null {
  const request = pending
  pending = null
  return request
}

export function onAssetOpenRequest(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
