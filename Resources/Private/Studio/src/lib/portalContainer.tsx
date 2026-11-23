import * as React from 'react'

/**
 * Where popups portal to: body by default, or the open native popover
 * (top layer) they are opened from - see NativePopover. Rendered inside
 * it, a menu or dialog stays above the popover and counts as inside for
 * its light dismiss.
 */
export const PortalContainerContext = React.createContext<HTMLElement | null>(
  null,
)

/** A Base UI Portal that renders into the current portal container. */
export function containedPortal<
  P extends { container?: unknown; children?: React.ReactNode },
>(Portal: React.ComponentType<P>): React.ComponentType<P> {
  function ContainedPortal(props: P) {
    const container = React.useContext(PortalContainerContext)
    return (
      <Portal
        {...props}
        container={props.container ?? container ?? undefined}
      />
    )
  }
  return ContainedPortal
}
