import * as React from 'react'
import {
  onPreviewEscape,
  onPreviewPointerDown,
} from '@/features/preview/chromeStore'
import { PortalContainerContext } from '@/lib/portalContainer'
import { cn } from '@/lib/utils'
import { useAnchoredStyle, type Placement } from './anchoring'

export { anchorProps, type Placement } from './anchoring'

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

  const anchored = useAnchoredStyle(anchor, placement, open)

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
