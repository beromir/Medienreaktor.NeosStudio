import * as React from 'react'

/** Where a popover sits relative to its anchor. */
export interface Placement {
  /** right: fitted placements only. */
  side: 'top' | 'bottom' | 'right'
  /** The anchor edge (or centre) the popover's left edge starts from; end: the right edges line up. */
  align: 'start' | 'center' | 'end'
  /** Gap to the anchor, px. */
  offset: number
  /** Horizontal shift from the aligned edge, px. */
  shift?: number
  /**
   * Centre the popover's box on the anchor, flip to the other side when
   * there is no room and keep it inside the viewport (tooltips). `align`
   * and `shift` are ignored then.
   */
  fit?: boolean
}

export const anchorPositioning =
  typeof CSS !== 'undefined' && CSS.supports('position-anchor: --a')

/** Props that make an element the anchor of a native popover. */
export function anchorProps(name: string) {
  return {
    'data-anchor': name,
    style: { anchorName: name } as React.CSSProperties,
  }
}

const MARGIN = {
  top: 'marginBottom',
  bottom: 'marginTop',
  right: 'marginLeft',
} as const

/** Keeps a fitted popover this far from the viewport edges, px. */
const VIEWPORT_MARGIN = 4

/**
 * The style that places a popover at its anchor: CSS anchor positioning
 * where the browser has it, measured in JavaScript (and kept up to date on
 * scroll and resize) where it does not. A fitted placement measures the
 * popover itself too, so pass its element.
 */
export function useAnchoredStyle(
  anchor: string,
  placement: Placement,
  open: boolean,
  element?: HTMLElement | null,
): React.CSSProperties {
  const [fallback, setFallback] = React.useState<React.CSSProperties>({})
  React.useLayoutEffect(() => {
    if (anchorPositioning || !open) return
    const measure = () => {
      const target = document.querySelector(`[data-anchor~="${anchor}"]`)
      if (!target) return
      const rect = target.getBoundingClientRect()
      setFallback(
        placement.fit
          ? fitted(rect, placement, element)
          : edges(rect, placement),
      )
    }
    measure()
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [open, anchor, placement, element])

  if (!anchorPositioning) return fallback
  if (placement.fit)
    return {
      positionAnchor: anchor,
      positionArea: placement.side,
      positionTryFallbacks:
        placement.side === 'right' ? 'flip-inline' : 'flip-block',
      [MARGIN[placement.side]]: placement.offset,
    } as React.CSSProperties
  const edge = placement.align === 'center' ? 'center' : 'left'
  return {
    positionAnchor: anchor,
    ...(placement.align === 'end'
      ? { right: `calc(anchor(right) - ${placement.shift ?? 0}px)` }
      : { left: `calc(anchor(${edge}) + ${placement.shift ?? 0}px)` }),
    ...(placement.side === 'top'
      ? { bottom: `calc(anchor(top) + ${placement.offset}px)` }
      : { top: `calc(anchor(bottom) + ${placement.offset}px)` }),
  } as React.CSSProperties
}

function edges(rect: DOMRect, placement: Placement): React.CSSProperties {
  const horizontal =
    placement.align === 'end'
      ? {
          right:
            document.documentElement.clientWidth -
            rect.right -
            (placement.shift ?? 0),
        }
      : {
          left:
            (placement.align === 'center'
              ? rect.left + rect.width / 2
              : rect.left) + (placement.shift ?? 0),
        }
  return placement.side === 'top'
    ? {
        ...horizontal,
        bottom: window.innerHeight - rect.top + placement.offset,
      }
    : { ...horizontal, top: rect.bottom + placement.offset }
}

function fitted(
  rect: DOMRect,
  placement: Placement,
  element: HTMLElement | null | undefined,
): React.CSSProperties {
  const width = element?.offsetWidth ?? 0
  const height = element?.offsetHeight ?? 0
  const viewportWidth = document.documentElement.clientWidth
  if (placement.side === 'right') {
    const right = rect.right + placement.offset
    return {
      left:
        right + width <= viewportWidth - VIEWPORT_MARGIN
          ? right
          : rect.left - placement.offset - width,
      top: Math.max(rect.top + rect.height / 2 - height / 2, VIEWPORT_MARGIN),
    }
  }
  const left = Math.min(
    Math.max(rect.left + rect.width / 2 - width / 2, VIEWPORT_MARGIN),
    viewportWidth - width - VIEWPORT_MARGIN,
  )
  const above = rect.top - placement.offset - height
  const below = rect.bottom + placement.offset
  const roomAbove = above >= VIEWPORT_MARGIN
  const roomBelow = below + height <= window.innerHeight - VIEWPORT_MARGIN
  const top =
    placement.side === 'top'
      ? roomAbove || !roomBelow
        ? above
        : below
      : roomBelow || !roomAbove
        ? below
        : above
  return { left, top }
}
