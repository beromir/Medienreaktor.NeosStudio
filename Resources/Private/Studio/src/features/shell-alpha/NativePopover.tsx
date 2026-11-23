import * as React from 'react'
import {
  onPreviewEscape,
  onPreviewPointerDown,
} from '@/features/preview/chromeStore'
import { PortalContainerContext } from '@/lib/portalContainer'
import { cn } from '@/lib/utils'

/** Where the popover sits relative to its anchor. */
export interface Placement {
  side: 'top' | 'bottom'
  /** The anchor edge (or centre) the popover's left edge starts from; end: the right edges line up. */
  align: 'start' | 'center' | 'end'
  /** Gap to the anchor, px. */
  offset: number
  /** Horizontal shift from the aligned edge, px. */
  shift?: number
}

const anchorPositioning =
  typeof CSS !== 'undefined' && CSS.supports('position-anchor: --a')

/** Props that make an element the anchor of a NativePopover. */
export function anchorProps(name: string) {
  return {
    'data-anchor': name,
    style: { anchorName: name } as React.CSSProperties,
  }
}

/**
 * A native popover (popover="auto"): the top layer, and the browser's own
 * light dismiss - Esc, a click outside, another popover opening. Anchored
 * with CSS anchor positioning, measured in JavaScript where that is missing.
 * The page in the preview is another document, so a click or Esc there is
 * relayed by the guest. Popups opened from inside portal into the popover,
 * so they stay above it and count as inside.
 *
 * Open it with popoverTarget={id} on a button (the browser toggles it and
 * the click does not light-dismiss it first); `open` follows and drives it.
 */
export function NativePopover({
  id,
  anchor,
  placement,
  open,
  onOpenChange,
  className,
  children,
}: {
  id: string
  anchor: string
  placement: Placement
  open: boolean
  onOpenChange: (open: boolean) => void
  className?: string
  children: React.ReactNode
}) {
  const [element, setElement] = React.useState<HTMLDivElement | null>(null)
  const onOpenChangeRef = React.useRef(onOpenChange)
  React.useLayoutEffect(() => {
    onOpenChangeRef.current = onOpenChange
  })

  React.useEffect(() => {
    if (!element) return
    const onToggle = (event: Event) =>
      onOpenChangeRef.current((event as ToggleEvent).newState === 'open')
    element.addEventListener('toggle', onToggle)
    return () => element.removeEventListener('toggle', onToggle)
  }, [element])

  React.useLayoutEffect(() => {
    if (!element) return
    const showing = element.matches(':popover-open')
    if (open && !showing) element.showPopover()
    if (!open && showing) element.hidePopover()
  }, [element, open])

  React.useEffect(() => {
    if (!open) return
    const close = () => onOpenChangeRef.current(false)
    const offDown = onPreviewPointerDown(close)
    const offEscape = onPreviewEscape(close)
    return () => {
      offDown()
      offEscape()
    }
  }, [open])

  const [fallback, setFallback] = React.useState<React.CSSProperties>({})
  React.useLayoutEffect(() => {
    if (anchorPositioning || !open) return
    const measure = () => {
      const target = document.querySelector(`[data-anchor="${anchor}"]`)
      if (!target) return
      const rect = target.getBoundingClientRect()
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
      setFallback(
        placement.side === 'top'
          ? {
              ...horizontal,
              bottom: window.innerHeight - rect.top + placement.offset,
            }
          : { ...horizontal, top: rect.bottom + placement.offset },
      )
    }
    measure()
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [open, anchor, placement])

  const edge = placement.align === 'center' ? 'center' : 'left'
  const anchored: React.CSSProperties = anchorPositioning
    ? ({
        positionAnchor: anchor,
        ...(placement.align === 'end'
          ? { right: `calc(anchor(right) - ${placement.shift ?? 0}px)` }
          : { left: `calc(anchor(${edge}) + ${placement.shift ?? 0}px)` }),
        ...(placement.side === 'top'
          ? { bottom: `calc(anchor(top) + ${placement.offset}px)` }
          : { top: `calc(anchor(bottom) + ${placement.offset}px)` }),
      } as React.CSSProperties)
    : fallback

  return (
    <div
      ref={setElement}
      id={id}
      popover="auto"
      style={anchored}
      className={cn(
        // Undo the UA popover box: the surface inside draws itself.
        'pointer-events-auto fixed inset-auto m-0 overflow-visible border-0 bg-transparent p-0 text-inherit',
        className,
      )}
    >
      <PortalContainerContext.Provider value={element}>
        {open && children}
      </PortalContainerContext.Provider>
    </div>
  )
}
