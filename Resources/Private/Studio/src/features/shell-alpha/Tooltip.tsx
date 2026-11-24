import * as React from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { useAnchoredStyle, type Placement } from './anchoring'

/** Hover this long before the first tooltip shows, ms. */
const OPEN_DELAY = 500
/** A tooltip that hid this recently hands over at once to the next, ms. */
const WARM_WINDOW = 300

const ABOVE: Placement = { side: 'top', align: 'center', offset: 6, fit: true }
const PLACEMENTS: Record<Side, Placement> = {
  top: ABOVE,
  bottom: { ...ABOVE, side: 'bottom' },
  right: { ...ABOVE, side: 'right' },
}

type Side = Placement['side']

// One tooltip at a time, across the whole shell: the browser closes another
// hint popover when one opens, but not in the manual fallback.
let active: string | null = null
let hiddenAt = 0
const listeners = new Set<() => void>()

function setActive(id: string | null) {
  if (active === id) return
  if (active !== null && id === null) hiddenAt = Date.now()
  active = id
  listeners.forEach((listener) => listener())
}

function useActive(): string | null {
  return React.useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => active,
  )
}

type TriggerProps = React.HTMLAttributes<HTMLElement> & {
  'data-anchor'?: string
}

/**
 * The alpha shell's tooltip: one short line over its trigger, a native
 * popover="hint" in the top layer - it never closes an open popover, and
 * browsers without hint treat it as manual. It shows on hover after a short
 * delay (at once while another one is showing) and on keyboard focus, and
 * hides on leave, blur, a press and Esc. It describes its trigger, or - with
 * `names`, on an icon-only button whose aria-label says the same - only
 * shows that name.
 *
 * Spread `props` onto the trigger (after its own, which they extend) and
 * render `tooltip` anywhere; see Tooltip for wrapping a single element.
 */
export function useTooltip(
  label: string,
  {
    side = 'top',
    names = false,
    own = {},
  }: {
    side?: Side
    names?: boolean
    /** The trigger's own props the returned ones must keep. */
    own?: TriggerProps
  } = {},
): { props: TriggerProps; tooltip: React.ReactNode } {
  const id = React.useId()
  const anchor = `--tip${id.replace(/[^a-zA-Z0-9_-]/g, '')}`
  const open = useActive() === id
  const timer = React.useRef<number | undefined>(undefined)

  const cancel = () => window.clearTimeout(timer.current)
  const show = () => {
    cancel()
    setActive(id)
  }
  const hide = () => {
    cancel()
    if (active === id) setActive(null)
  }

  React.useEffect(
    () => () => {
      window.clearTimeout(timer.current)
      if (active === id) setActive(null)
    },
    [id],
  )

  React.useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && active === id) setActive(null)
    }
    document.addEventListener('keydown', onKeyDown, true)
    return () => document.removeEventListener('keydown', onKeyDown, true)
  }, [open, id])

  const props: TriggerProps = {
    'data-anchor': cn(own['data-anchor'], anchor),
    style: {
      ...own.style,
      anchorName: [own.style?.anchorName, anchor].filter(Boolean).join(', '),
    } as React.CSSProperties,
    'aria-describedby': names
      ? own['aria-describedby']
      : cn(own['aria-describedby'], id),
    onPointerEnter: (event) => {
      own.onPointerEnter?.(event)
      if (event.pointerType === 'touch') return
      if (active !== null || Date.now() - hiddenAt < WARM_WINDOW) show()
      else {
        cancel()
        timer.current = window.setTimeout(show, OPEN_DELAY)
      }
    },
    onPointerLeave: (event) => {
      own.onPointerLeave?.(event)
      hide()
    },
    onPointerDown: (event) => {
      own.onPointerDown?.(event)
      hide()
    },
    onFocus: (event) => {
      own.onFocus?.(event)
      if (event.currentTarget.matches(':focus-visible')) show()
    },
    onBlur: (event) => {
      own.onBlur?.(event)
      hide()
    },
  }

  // Mounted while hidden too, so aria-describedby always finds its text.
  const tooltip = createPortal(
    <Bubble
      id={id}
      anchor={anchor}
      placement={PLACEMENTS[side]}
      open={open}
      hidden={names}
      onClosed={hide}
    >
      {label}
    </Bubble>,
    document.body,
  )
  return { props, tooltip }
}

type TooltipProps = {
  /** Without one, the trigger renders alone. */
  label: string | undefined
  side?: Side
  children: React.ReactElement<TriggerProps & { 'aria-label'?: string }>
}

/**
 * useTooltip around a single trigger element that takes DOM props. An
 * aria-label equal to the label makes the tooltip show that name instead of
 * describing the trigger.
 */
export function Tooltip(props: TooltipProps) {
  return props.label ? (
    <LabelledTooltip {...props} label={props.label} />
  ) : (
    props.children
  )
}

function LabelledTooltip({
  label,
  side,
  children,
}: TooltipProps & { label: string }) {
  const own = children.props
  const { props, tooltip } = useTooltip(label, {
    side,
    names: own['aria-label'] === label,
    own,
  })
  return (
    <>
      {React.cloneElement(children, props)}
      {tooltip}
    </>
  )
}

function Bubble({
  id,
  anchor,
  placement,
  open,
  hidden,
  onClosed,
  children,
}: {
  id: string
  anchor: string
  placement: Placement
  open: boolean
  /** The trigger's accessible name says it already. */
  hidden: boolean
  onClosed: () => void
  children: React.ReactNode
}) {
  const [element, setElement] = React.useState<HTMLDivElement | null>(null)
  const onClosedRef = React.useRef(onClosed)
  React.useLayoutEffect(() => {
    onClosedRef.current = onClosed
  })

  // Before useAnchoredStyle: the measured fallback reads the shown size.
  React.useLayoutEffect(() => {
    if (!element) return
    const showing = element.matches(':popover-open')
    if (open && !showing) element.showPopover()
    if (!open && showing) element.hidePopover()
  }, [element, open])

  React.useEffect(() => {
    if (!element) return
    // The browser closes a hint itself too (Esc, another hint opening).
    const onToggle = (event: Event) => {
      if ((event as ToggleEvent).newState === 'closed') onClosedRef.current()
    }
    element.addEventListener('toggle', onToggle)
    return () => element.removeEventListener('toggle', onToggle)
  }, [element])

  const style = useAnchoredStyle(anchor, placement, open, element)

  return (
    <div
      ref={setElement}
      id={id}
      popover="hint"
      role="tooltip"
      aria-hidden={hidden || undefined}
      style={style}
      className="pointer-events-none fixed inset-auto m-0 h-5.5 items-center overflow-visible rounded-shell-segment border border-shell-tooltip-border bg-shell-raised px-1.75 text-[0.6875rem] leading-3.5 whitespace-nowrap text-shell-text shadow-shell-tooltip open:flex"
    >
      {children}
    </div>
  )
}
