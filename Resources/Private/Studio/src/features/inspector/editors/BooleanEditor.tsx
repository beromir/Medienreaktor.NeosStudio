import { useState } from 'react'
import { Switch } from '@base-ui/react/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { useInspectorLayout } from '../layoutContext'
import type { PropertyEditorComponent } from './registry'

export const BOOLEAN_EDITOR = 'Neos.Neos/Inspector/Editors/BooleanEditor'

/**
 * A boolean checkbox - a switch in the alpha layout, where checkboxes only
 * pick items for a later action. Renders its own label beside the control
 * (registered with rendersOwnLabel, so the host does not add a label above
 * it). No editing phase - it commits on every toggle. Local state gives
 * instant feedback on a toggle, but the control also adopts an external
 * value change: the inspector edits the same subject in place (the mount key
 * is the node address, unchanged when a tag flips), so hiding a node from a
 * context menu must still tick the "Hidden" box without a remount.
 * editorOptions.disabled shows it read-only.
 */
export const BooleanEditor: PropertyEditorComponent = ({
  subject,
  value,
  options,
  onCommit,
}) => {
  const alpha = useInspectorLayout() !== 'full'
  const disabled = options.disabled === true
  const external = value === true
  const [checked, setChecked] = useState(external)
  const [lastExternal, setLastExternal] = useState(external)
  if (external !== lastExternal) {
    setLastExternal(external)
    setChecked(external)
  }
  const toggle = (next: boolean) => {
    setChecked(next)
    onCommit(next)
  }
  if (alpha)
    return (
      <label
        className={cn(
          'flex items-center gap-2 text-[0.75rem] leading-4 text-shell-quiet',
          disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer',
        )}
      >
        <Switch.Root
          checked={checked}
          disabled={disabled}
          onCheckedChange={toggle}
          className="group relative h-4 w-7.5 shrink-0 cursor-[inherit] rounded-full outline-none focus-visible:ring-2 focus-visible:ring-shell-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-shell-surface"
        >
          <span className="absolute top-0.75 left-0.5 h-2.5 w-6.5 rounded-[0.3125rem] bg-shell-switch-track transition-colors group-data-checked:bg-shell-accent-check" />
          <Switch.Thumb className="absolute top-0 left-0 size-4 rounded-full bg-shell-subtle shadow-shell-thumb transition-[left,background-color] data-checked:left-3.5 data-checked:bg-shell-accent-pale" />
        </Switch.Root>
        {subject.label}
      </label>
    )
  return (
    <label
      className={cn(
        'flex items-center gap-2 type-body',
        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
      )}
    >
      <Checkbox
        checked={checked}
        disabled={disabled}
        onCheckedChange={toggle}
      />
      {subject.label}
    </label>
  )
}
