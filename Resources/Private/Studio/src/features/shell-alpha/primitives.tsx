import * as React from 'react'
import { Menu as MenuPrimitive } from '@base-ui/react/menu'
import { cn } from '@/lib/utils'
import { containedPortal } from '@/lib/portalContainer'
import { translate as t } from '@/lib/i18n'
import { PinIcon } from './icons'

const MenuPortalContained = containedPortal(MenuPrimitive.Portal)

/*
 * The alpha layout's building blocks. The one fill rule: only Add is
 * filled; every other button is plain and shows the hover fill while hovered
 * or while the tray/menu it opened is open (data-popup-open / data-open).
 */

/** A vertical rail container: fully round, 44px wide. */
export function RailPill({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'flex w-11 shrink-0 flex-col items-center gap-0.5 self-start rounded-full border border-shell-border bg-shell-surface p-0.75',
        className,
      )}
      {...props}
    />
  )
}

const plain =
  'inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full text-shell-text outline-none transition-colors hover:bg-shell-hover focus-visible:ring-2 focus-visible:ring-shell-accent/60 disabled:cursor-default disabled:text-shell-disabled disabled:hover:bg-transparent data-popup-open:bg-shell-hover data-[open=true]:bg-shell-hover [--knob:var(--color-shell-surface)] hover:[--knob:var(--color-shell-hover)] data-popup-open:[--knob:var(--color-shell-hover)] data-[open=true]:[--knob:var(--color-shell-hover)]'

/** A plain round icon button; 36px in the bars, 32px in the top bar. */
export const IconButton = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<'button'> & { size?: 'md' | 'sm'; open?: boolean }
>(function IconButton({ className, size = 'md', open, ...props }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      data-open={open || undefined}
      className={cn(plain, size === 'md' ? 'size-9' : 'size-8', className)}
      {...props}
    />
  )
})

/** A plain round button with a label. */
export const LabelButton = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<'button'> & { open?: boolean }
>(function LabelButton({ className, open, ...props }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      data-open={open || undefined}
      className={cn(
        plain,
        'h-9 gap-2 pr-3.5 pl-3 type-shell-control',
        className,
      )}
      {...props}
    />
  )
})

/** The one filled button: round, solid accent. */
export const AddButton = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<'button'>
>(function AddButton({ className, ...props }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        'inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-shell-accent text-white outline-none transition-[filter] hover:brightness-110 focus-visible:ring-2 focus-visible:ring-white/60 data-popup-open:brightness-110',
        className,
      )}
      {...props}
    />
  )
})

/** A floating pill of the action bar: 48px high, 6px padding. */
export function BarPill({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'flex h-12 items-center gap-0.5 rounded-full border border-shell-border-strong bg-shell-bar px-1.5 shadow-shell-bar',
        className,
      )}
      {...props}
    />
  )
}

/** A floating surface: tray, menu, dropdown, panel. */
export function Surface({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'rounded-shell-surface border border-shell-border-strong bg-shell-surface text-shell-text shadow-shell-surface',
        className,
      )}
      {...props}
    />
  )
}

export const surfacePopup =
  'origin-(--transform-origin) rounded-shell-surface border border-shell-border-strong bg-shell-surface text-shell-text shadow-shell-surface outline-none transition-[opacity,scale] duration-150 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0'

/** A menu in the shell's surface style. */
export function ShellMenu({
  trigger,
  children,
  side = 'bottom',
  align = 'start',
  sideOffset = 6,
  className,
}: {
  trigger: React.ReactElement<Record<string, unknown>>
  children: React.ReactNode
  side?: 'top' | 'bottom' | 'left' | 'right'
  align?: 'start' | 'center' | 'end'
  sideOffset?: number
  className?: string
}) {
  return (
    <MenuPrimitive.Root>
      <MenuPrimitive.Trigger render={trigger} />
      <MenuPortalContained>
        <MenuPrimitive.Positioner
          side={side}
          align={align}
          sideOffset={sideOffset}
          className="z-200 outline-none"
        >
          <MenuPrimitive.Popup className={cn(surfacePopup, 'p-1', className)}>
            {children}
          </MenuPrimitive.Popup>
        </MenuPrimitive.Positioner>
      </MenuPortalContained>
    </MenuPrimitive.Root>
  )
}

export function ShellMenuItem({
  icon,
  trailing,
  className,
  children,
  ...props
}: React.ComponentProps<typeof MenuPrimitive.Item> & {
  icon?: React.ReactNode
  trailing?: React.ReactNode
}) {
  return (
    <MenuPrimitive.Item
      className={cn(
        'flex h-8 cursor-default items-center gap-2.5 rounded-shell-control px-2.5 type-shell-control text-shell-text outline-none select-none data-disabled:text-shell-disabled data-highlighted:bg-shell-hover-inset',
        className,
      )}
      {...props}
    >
      {icon !== undefined && (
        <span className="flex w-4 shrink-0 justify-center text-shell-muted">
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {trailing !== undefined && (
        <span className="shrink-0 type-shell-secondary text-shell-subtle">
          {trailing}
        </span>
      )}
    </MenuPrimitive.Item>
  )
}

export function ShellMenuSeparator() {
  return <div role="separator" className="my-1 h-px bg-shell-border-strong" />
}

/** The 1px rule between groups of an action bar pill. */
export function BarDivider() {
  return <div className="h-5 w-px shrink-0 bg-shell-divider" aria-hidden />
}

/**
 * Pins a docked panel: a pinned panel stays when another opens, which
 * opens beside it.
 */
export function PinButton({
  pinned,
  onClick,
}: {
  pinned: boolean
  onClick: () => void
}) {
  const label = pinned
    ? t('shellAlpha.unpin', 'Unpin')
    : t('shellAlpha.pin', 'Pin')
  return (
    <button
      type="button"
      aria-pressed={pinned}
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        'inline-flex size-7 shrink-0 cursor-pointer items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-shell-accent/60',
        pinned
          ? 'rounded-full bg-shell-ground text-shell-text'
          : 'rounded-shell-control text-shell-muted hover:bg-shell-hover hover:text-shell-text',
      )}
    >
      <PinIcon
        filled={pinned}
        width={pinned ? 12 : 14}
        height={pinned ? 12 : 14}
      />
    </button>
  )
}
