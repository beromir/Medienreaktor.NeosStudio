import * as React from 'react'
import {
  keepPreviousData,
  skipToken,
  useQueries,
  useQuery,
} from '@tanstack/react-query'
import { searchAssets } from '@/api/neos/endpoints/assets'
import {
  CONTENT_NODE_TYPE,
  DOCUMENT_NODE_TYPE,
  fetchChildren,
  searchNodeListing,
} from '@/api/neos/endpoints/nodes'
import {
  isOfType,
  type NodeTypeMap,
  useNodeTypes,
} from '@/api/neos/endpoints/nodeTypes'
import { neosKeys } from '@/api/neos/keys'
import {
  type Asset,
  type Node,
  type NodeAddress,
  nodeAddressOf,
} from '@/api/neos/schema'
import { branchingParents, treeOrder } from './searchText'

export type SearchScope = 'site' | 'page' | 'media'

/** A page or content element the search found. */
export interface NodeHit {
  nodeAggregateId: string
  node: Node
  /** Nearest first, up to the site node. */
  ancestors: Node[]
  /** The document the hit is, or the one it is in. */
  document: Node | null
}

export interface HitGroup<T> {
  hits: T[]
  /** How many there are in all - more than `hits` past the limit. */
  total: number
}

export interface SiteSearch {
  pages: HitGroup<NodeHit> | null
  content: HitGroup<NodeHit> | null
  media: HitGroup<Asset> | null
  /** Something is still loading for the current term and scope. */
  pending: boolean
}

/** As many as the dialog shows when a group is expanded. */
const LIMIT = 100
/** Shorter terms match nearly everything. */
export const MIN_TERM_LENGTH = 2

function nodeHit(node: Node, nodeTypes: NodeTypeMap | undefined): NodeHit {
  const ancestors = node.ancestors ?? []
  const isDocument = (candidate: Node) =>
    nodeTypes !== undefined &&
    isOfType(nodeTypes, candidate.nodeType, DOCUMENT_NODE_TYPE)
  return {
    nodeAggregateId: node.nodeAggregateId,
    node,
    ancestors,
    document: isDocument(node) ? node : (ancestors.find(isDocument) ?? null),
  }
}

function useNodeSearch(
  context: NodeAddress | null,
  term: string,
  nodeType: string,
) {
  return useQuery({
    queryKey: [
      ...neosKeys.nodes.descendants(context, {
        nodeTypes: nodeType,
        search: term,
      }),
      'listing',
    ],
    queryFn:
      context !== null
        ? ({ signal }) =>
            searchNodeListing(context, term, nodeType, LIMIT, signal)
        : skipToken,
    placeholderData: keepPreviousData,
  })
}

/**
 * The site-wide search: pages, then content in tree order, then media. In
 * the page scope only the content of that page, not of the pages below it.
 */
export function useSiteSearch({
  term,
  scope,
  site,
  page,
}: {
  term: string
  scope: SearchScope
  /** The site node in the editing context. */
  site: NodeAddress | null
  /** The page shown in the preview. */
  page: NodeAddress | null
}): SiteSearch {
  const { data: nodeTypes } = useNodeTypes()
  const searching = term.length >= MIN_TERM_LENGTH
  const pages = useNodeSearch(
    searching && scope === 'site' ? site : null,
    term,
    DOCUMENT_NODE_TYPE,
  )
  const content = useNodeSearch(
    searching && scope !== 'media' ? (scope === 'page' ? page : site) : null,
    term,
    CONTENT_NODE_TYPE,
  )
  const media = useQuery({
    queryKey: [...neosKeys.assets.all, 'search', term],
    queryFn:
      searching && scope !== 'page'
        ? ({ signal }) => searchAssets(term, LIMIT, signal)
        : skipToken,
    placeholderData: keepPreviousData,
  })

  const rawPages = React.useMemo(
    () =>
      searching && scope === 'site' && pages.data
        ? pages.data.nodes.map((node) => nodeHit(node, nodeTypes))
        : null,
    [searching, scope, pages.data, nodeTypes],
  )
  const rawContent = React.useMemo(() => {
    if (!searching || scope === 'media' || !content.data) return null
    const hits = content.data.nodes.map((node) => nodeHit(node, nodeTypes))
    return scope === 'page'
      ? hits.filter(
          (hit) => hit.document?.nodeAggregateId === page?.nodeAggregateId,
        )
      : hits
  }, [searching, scope, content.data, nodeTypes, page?.nodeAggregateId])
  const allHits = React.useMemo(
    () => [...(rawPages ?? []), ...(rawContent ?? [])],
    [rawPages, rawContent],
  )
  const positions = useChildPositions(allHits)

  const pageHits = React.useMemo(
    () =>
      rawPages && pages.data
        ? { hits: treeOrder(rawPages, positions), total: pages.data.total }
        : null,
    [rawPages, pages.data, positions],
  )
  const contentHits = React.useMemo(() => {
    if (!rawContent || !content.data) return null
    // In the page scope the pages below it are left out: of what was read,
    // only these count.
    const total =
      scope === 'page' && content.data.total <= content.data.nodes.length
        ? rawContent.length
        : content.data.total
    return { hits: treeOrder(rawContent, positions), total }
  }, [rawContent, content.data, positions, scope])

  const mediaHits = React.useMemo(
    () =>
      searching && scope !== 'page' && media.data
        ? { hits: media.data.assets, total: media.data.total }
        : null,
    [searching, scope, media.data],
  )

  return {
    pages: pageHits,
    content: contentHits,
    media: mediaHits,
    pending:
      searching &&
      ((scope === 'site' && pages.isFetching) ||
        (scope !== 'media' && content.isFetching) ||
        (scope !== 'page' && media.isFetching)),
  }
}

/** Reading the child order of more parents than this costs more than it adds. */
const MAX_ORDERED_PARENTS = 40

/**
 * The positions among their siblings of the nodes where the hits' branches
 * part, read with the children of their parents.
 */
export function useChildPositions(
  hits: Pick<NodeHit, 'nodeAggregateId' | 'node' | 'ancestors'>[],
): ReadonlyMap<string, number> {
  const parents = React.useMemo(() => {
    const nodes = new Map<string, Node>()
    for (const hit of hits) {
      nodes.set(hit.nodeAggregateId, hit.node)
      for (const ancestor of hit.ancestors)
        nodes.set(ancestor.nodeAggregateId, ancestor)
    }
    return branchingParents(hits)
      .slice(0, MAX_ORDERED_PARENTS)
      .flatMap((id) => {
        const node = nodes.get(id)
        return node ? [nodeAddressOf(node)] : []
      })
  }, [hits])
  const results = useQueries({
    queries: parents.map((address) => ({
      queryKey: [...neosKeys.nodes.children(address), 'search-order'],
      queryFn: () => fetchChildren(address),
    })),
  })
  const children = results.map((result) => result.data)
  const key = JSON.stringify(
    children.map((list) => list?.map((child) => child.nodeAggregateId)),
  )
  return React.useMemo(() => {
    const positions = new Map<string, number>()
    for (const list of children)
      list?.forEach((child, index) =>
        positions.set(child.nodeAggregateId, index),
      )
    return positions
    // Keyed by the ids: useQueries hands out new arrays on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
}

/**
 * How often the term is found on the site in each of the other dimension
 * space points - asked only while `enabled` (nothing found here).
 */
export function useOtherLanguageCounts(
  site: NodeAddress | null,
  term: string,
  points: string[],
  enabled: boolean,
): Array<{ point: string; count: number }> {
  const nodeTypes = `${DOCUMENT_NODE_TYPE},${CONTENT_NODE_TYPE}`
  const results = useQueries({
    queries: points.map((point) => {
      const context = site ? { ...site, dimensionSpacePoint: point } : null
      return {
        queryKey: [
          ...neosKeys.nodes.descendants(context, { nodeTypes, search: term }),
          'count',
        ],
        queryFn:
          enabled && context !== null && term.length >= MIN_TERM_LENGTH
            ? ({ signal }: { signal: AbortSignal }) =>
                searchNodeListing(context, term, nodeTypes, 1, signal)
            : skipToken,
      }
    }),
  })
  return points.flatMap((point, index) => {
    const count = results[index]?.data?.total ?? 0
    return enabled && count > 0 ? [{ point, count }] : []
  })
}
