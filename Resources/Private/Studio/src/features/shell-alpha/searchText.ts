const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  shy: '',
}

/** Rich text as plain text: tags gone, entities decoded, whitespace collapsed. */
export function stripMarkup(html: string): string {
  return html
    .replace(/<(br|\/p|\/li|\/h\d|\/div|\/td|\/th)\b[^>]*>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, name: string) => {
      if (name[0] === '#') {
        const code =
          name[1] === 'x' || name[1] === 'X'
            ? parseInt(name.slice(2), 16)
            : parseInt(name.slice(1), 10)
        return Number.isFinite(code) ? String.fromCodePoint(code) : entity
      }
      return ENTITIES[name.toLowerCase()] ?? entity
    })
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * What to highlight: the whole term where the text has it, else its words -
 * the full-text search matches words apart, too.
 */
export function searchNeedles(text: string, term: string): string[] {
  const whole = term.trim()
  if (whole === '') return []
  if (text.toLowerCase().includes(whole.toLowerCase())) return [whole]
  return whole
    .split(/\s+/)
    .filter(
      (word) =>
        word.length > 1 && text.toLowerCase().includes(word.toLowerCase()),
    )
}

export interface TextPart {
  text: string
  match: boolean
}

/** The text in parts, the occurrences of the term (or its words) marked. */
export function highlightParts(text: string, term: string): TextPart[] {
  const needles = searchNeedles(text, term)
  if (needles.length === 0) return text === '' ? [] : [{ text, match: false }]
  const pattern = new RegExp(
    needles
      .sort((a, b) => b.length - a.length)
      .map((needle) => needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('|'),
    'gi',
  )
  const parts: TextPart[] = []
  let last = 0
  for (const found of text.matchAll(pattern)) {
    const start = found.index
    if (start > last)
      parts.push({ text: text.slice(last, start), match: false })
    parts.push({ text: found[0], match: true })
    last = start + found[0].length
  }
  if (last < text.length) parts.push({ text: text.slice(last), match: false })
  return parts
}

/**
 * The text around the first occurrence of the term, cut at word boundaries
 * with an ellipsis where it was cut; null when the text lacks the term.
 */
export function snippetAround(
  text: string,
  term: string,
  radius = 48,
): string | null {
  const [needle] = searchNeedles(text, term)
  if (needle === undefined) return null
  const at = text.toLowerCase().indexOf(needle.toLowerCase())
  if (text.length <= radius * 2 + needle.length) return text
  let start = Math.max(0, at - radius)
  let end = Math.min(text.length, at + needle.length + radius)
  if (start > 0) {
    const space = text.indexOf(' ', start)
    if (space !== -1 && space < at) start = space + 1
  }
  if (end < text.length) {
    const space = text.lastIndexOf(' ', end)
    if (space > at + needle.length) end = space
  }
  return `${start > 0 ? '…' : ''}${text.slice(start, end)}${end < text.length ? '…' : ''}`
}

/**
 * The match in context from a node's properties: the first text property
 * containing the term, as plain text around it. Internal properties
 * (`_hidden`, ...) and URL path segments are skipped. Null when none has it.
 */
export function propertySnippet(
  properties: Record<string, unknown>,
  term: string,
  preferred: string[] = [],
): string | null {
  const names = [
    ...preferred.filter((name) => name in properties),
    ...Object.keys(properties).filter((name) => !preferred.includes(name)),
  ]
  for (const name of names) {
    const value = properties[name]
    if (
      typeof value !== 'string' ||
      name.startsWith('_') ||
      name === 'uriPathSegment'
    )
      continue
    const snippet = snippetAround(stripMarkup(value), term)
    if (snippet !== null) return snippet
  }
  return null
}

export interface TreeHit {
  nodeAggregateId: string
  /** Nearest first, up to the site node. */
  ancestors: ReadonlyArray<{ nodeAggregateId: string }>
}

function treePath(hit: TreeHit): string[] {
  return [
    ...hit.ancestors.map((ancestor) => ancestor.nodeAggregateId).reverse(),
    hit.nodeAggregateId,
  ]
}

/**
 * The nodes whose child order treeOrder needs: those with hits below two or
 * more of their children. The search's own order (level by level, by
 * position within each parent) doesn't say how cousins compare.
 */
export function branchingParents(hits: readonly TreeHit[]): string[] {
  const children = new Map<string, Set<string>>()
  for (const hit of hits) {
    const path = treePath(hit)
    for (let level = 1; level < path.length; level++) {
      const parent = path[level - 1]!
      const below = children.get(parent) ?? new Set()
      below.add(path[level]!)
      children.set(parent, below)
    }
  }
  return [...children]
    .filter(([, below]) => below.size > 1)
    .map(([parent]) => parent)
}

/**
 * The hits in depth-first tree order, using the child positions known
 * (`positions`: a node's index among its siblings) where two branches part.
 * Without them, the branch whose first hit the search listed first goes
 * first.
 */
export function treeOrder<T extends TreeHit>(
  hits: readonly T[],
  positions: ReadonlyMap<string, number> = new Map(),
): T[] {
  const paths = new Map<T, string[]>()
  const firstSeen = new Map<string, number>()
  hits.forEach((hit, index) => {
    const path = treePath(hit)
    paths.set(hit, path)
    for (const id of path) if (!firstSeen.has(id)) firstSeen.set(id, index)
  })
  return [...hits].sort((a, b) => {
    const left = paths.get(a)!
    const right = paths.get(b)!
    for (let level = 0; level < Math.min(left.length, right.length); level++) {
      const l = left[level]!
      const r = right[level]!
      if (l === r) continue
      const lp = positions.get(l)
      const rp = positions.get(r)
      if (lp !== undefined && rp !== undefined) return lp - rp
      return firstSeen.get(l)! - firstSeen.get(r)!
    }
    return left.length - right.length
  })
}

/**
 * The URL path of a document from the URL path segments of the documents
 * down to it, without the site's: "/blog/summer-offers-2026". Null when one
 * lacks a segment.
 */
export function documentPath(
  documents: ReadonlyArray<{ properties: Record<string, unknown> }>,
): string | null {
  const segments = documents.map(
    (document) => document.properties.uriPathSegment,
  )
  if (!segments.every((segment) => typeof segment === 'string' && segment))
    return null
  return `/${segments.join('/')}`
}

/** Recent searches: the newest first, each once, at most `limit`. */
export function rememberSearch(
  recent: readonly string[],
  term: string,
  limit = 5,
): string[] {
  const trimmed = term.trim()
  if (trimmed === '') return [...recent]
  return [
    trimmed,
    ...recent.filter((entry) => entry.toLowerCase() !== trimmed.toLowerCase()),
  ].slice(0, limit)
}
