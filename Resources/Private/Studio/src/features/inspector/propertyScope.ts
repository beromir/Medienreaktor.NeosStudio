import type { ContentDimension, PropertyScope } from '@/api/neos/schema'

export type SharedScope = Exclude<PropertyScope, 'node'>

/**
 * What a shared property spans, in the editor's words: "languages" when the
 * content varies by language alone, "variants" otherwise.
 */
export function scopeNoun(
  dimensions: Pick<ContentDimension, 'id'>[],
): 'languages' | 'variants' {
  const [only, ...others] = dimensions
  return only && others.length === 0 && /^lang(uage)?s?$/i.test(only.id)
    ? 'languages'
    : 'variants'
}

/**
 * The dimension space points an edit of a shared property changes, out of
 * those the node is reachable in: all of them for nodeAggregate, for
 * specializations the edited one and the points specializing it in every
 * dimension.
 */
export function scopeReach(
  scope: SharedScope,
  edited: string,
  covered: string[],
  dimensions: Pick<ContentDimension, 'id' | 'values'>[],
): string[] {
  if (scope === 'nodeAggregate') return covered
  const origin = coordinates(edited)
  return covered.filter((point) => {
    const candidate = coordinates(point)
    return dimensions.every((dimension) =>
      specializes(dimension, candidate[dimension.id], origin[dimension.id]),
    )
  })
}

function specializes(
  dimension: Pick<ContentDimension, 'values'>,
  value: string | undefined,
  general: string | undefined,
): boolean {
  const seen = new Set<string>()
  let current = value
  while (current !== undefined && !seen.has(current)) {
    if (current === general) return true
    seen.add(current)
    current =
      dimension.values.find((candidate) => candidate.value === current)
        ?.generalization ?? undefined
  }
  return false
}

function coordinates(point: string): Record<string, string> {
  try {
    const parsed = JSON.parse(point) as unknown
    return parsed !== null && typeof parsed === 'object'
      ? (parsed as Record<string, string>)
      : {}
  } catch {
    return {}
  }
}
