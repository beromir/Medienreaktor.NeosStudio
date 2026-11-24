import { isOfType, type NodeTypeMap } from '@/api/neos/endpoints/nodeTypes'
import { iconImage } from '@/features/actions/iconImage'

export type GuestNodeTypes = Record<
  string,
  { label: string; icon: string | null }
>

const CONTENT = 'Neos.Neos:Content'
const CONTENT_COLLECTION = 'Neos.Neos:ContentCollection'

const cache = new WeakMap<NodeTypeMap, Promise<GuestNodeTypes>>()

/**
 * The content node types as the guest names them (neos-studio/node-types):
 * the label, and the icon drawn into an image, since the page has no icon
 * font.
 */
export function guestNodeTypes(map: NodeTypeMap): Promise<GuestNodeTypes> {
  let types = cache.get(map)
  if (!types) {
    types = collect(map)
    cache.set(map, types)
  }
  return types
}

async function collect(map: NodeTypeMap): Promise<GuestNodeTypes> {
  const entries = await Promise.all(
    [...map.values()]
      .filter(
        (nodeType) =>
          !nodeType.isAbstract &&
          (isOfType(map, nodeType.name, CONTENT) ||
            isOfType(map, nodeType.name, CONTENT_COLLECTION)),
      )
      .map(
        async (nodeType) =>
          [
            nodeType.name,
            {
              label: nodeType.label,
              icon: await iconImage(nodeType.icon ?? 'cube'),
            },
          ] as const,
      ),
  )
  return Object.fromEntries(entries)
}
