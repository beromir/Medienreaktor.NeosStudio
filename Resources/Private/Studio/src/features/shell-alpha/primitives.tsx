import * as React from 'react'
import { Menu as MenuPrimitive } from '@base-ui/react/menu'
import { cn } from '@/lib/utils'
import { containedPortal } from '@/lib/portalContainer'
import { translate as t } from '@/lib/i18n'
import { ActionIcon } from './icons'
import { Tooltip } from './Tooltip'

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

/**
 * The alpha checkbox look on a span, for a row that is the checkbox itself
 * (role="checkbox" on the row's button): the same data-slot and state
 * attributes as the Base UI Checkbox, so shell-alpha.css draws both.
 */
export function CheckboxBox({
  checked,
  className,
}: {
  checked: boolean | 'mixed'
  className?: string
}) {
  return (
    <span
      data-slot="checkbox"
      data-checked={checked === true ? '' : undefined}
      data-indeterminate={checked === 'mixed' ? '' : undefined}
      aria-hidden
      className={className}
    >
      {checked !== false && <span data-slot="checkbox-indicator" />}
    </span>
  )
}

/** The 1px rule between groups of an action bar pill. */
export function BarDivider() {
  return <div className="h-5 w-px shrink-0 bg-shell-divider" aria-hidden />
}

/**
 * A 28px icon action of a panel header (the set's 14px icons): #9A9A9A at
 * rest, #EDEDED on a grey fill while on.
 */
export const HeaderAction = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<'button'> & { label: string; on?: boolean }
>(function HeaderAction({ label, on = false, className, ...props }, ref) {
  return (
    <Tooltip label={label}>
      <button
        ref={ref}
        type="button"
        aria-label={label}
        className={cn(
          'inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-shell-control outline-none focus-visible:ring-2 focus-visible:ring-shell-accent/60 disabled:cursor-default disabled:text-shell-disabled disabled:hover:bg-transparent',
          on
            ? 'bg-shell-raised text-shell-text'
            : 'text-shell-muted hover:bg-shell-ground hover:text-shell-text data-popup-open:bg-shell-raised data-popup-open:text-shell-text',
          className,
        )}
        {...props}
      />
    </Tooltip>
  )
})

/** The hairline before a panel's own actions (close, pin). */
export function HeaderDivider() {
  return (
    <span className="flex h-7 w-2.25 shrink-0 items-center justify-center">
      <span className="h-4 w-px bg-shell-divider" />
    </span>
  )
}

/**
 * The Properties panel's pin: pinned, the panel docks beside the preview
 * and the preview narrows; unpinned, it floats over the preview.
 */
export function PinButton({
  pinned,
  onClick,
}: {
  pinned: boolean
  onClick: () => void
}) {
  return (
    <HeaderAction
      label={
        pinned ? t('shellAlpha.unpin', 'Unpin') : t('shellAlpha.pin', 'Pin')
      }
      aria-pressed={pinned}
      on={pinned}
      onClick={onClick}
    >
      <ActionIcon name={pinned ? 'pinned' : 'pin'} />
    </HeaderAction>
  )
}

/** A panel's close. */
export function CloseAction({ onClick }: { onClick: () => void }) {
  return (
    <HeaderAction label={t('common.close', 'Close')} onClick={onClick}>
      <ActionIcon name="close" />
    </HeaderAction>
  )
}

/** A left panel's header: title, a quiet subtitle and close. */
export function PanelHeader({
  title,
  subtitle,
  onClose,
}: {
  title: string
  subtitle?: string
  onClose: () => void
}) {
  return (
    <div className="flex h-11 shrink-0 items-center justify-between gap-2 pr-2 pl-4">
      <div className="flex min-w-0 items-baseline gap-2">
        <span className="shrink-0 type-shell-control font-semibold text-shell-text">
          {title}
        </span>
        {subtitle && (
          <span className="truncate type-shell-secondary text-shell-muted">
            {subtitle}
          </span>
        )}
      </div>
      <CloseAction onClick={onClose} />
    </div>
  )
}
