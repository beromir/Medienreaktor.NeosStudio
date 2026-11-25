import type { Node } from '@/api/neos/schema'

/** Open the action bar's Add menu at a position other than the selection's. */
export interface AddRequest {
  node: Node
  mode: 'after' | 'inside'
}

const listeners = new Set<(request: AddRequest) => void>()

export function requestAdd(request: AddRequest): void {
  listeners.forEach((listener) => listener(request))
}

export function onAddRequest(
  listener: (request: AddRequest) => void,
): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
