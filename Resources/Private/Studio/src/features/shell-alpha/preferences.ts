import * as React from 'react'
import { useMutation } from '@tanstack/react-query'
import { updateProfile, useProfile } from '@/api/neos/endpoints/me'
import { neosKeys } from '@/api/neos/keys'
import { queryClient } from '@/app/queryClient'
import { restorePinned, restoreStructure, type StructureLayout } from './dock'

/** The panels the editor pinned (docked); the others float. */
export const PINNED_PANELS_PREFERENCE = 'studio.alpha.pinnedPanels'
/** The docked left column's panel, null when folded. */
export const LEFT_PANEL_PREFERENCE = 'studio.alpha.leftPanel'
/** The structure panel's Pages height and folded sections. */
export const STRUCTURE_PREFERENCE = 'studio.alpha.structure'

/**
 * A user preference: the stored value, cut down by `restore`, and a
 * setter. A change shows at once and is saved in the background.
 */
export function useUserPreference<T>(
  key: string,
  restore: (value: unknown) => T,
): [T, (value: T) => void] {
  const { data: profile } = useProfile()
  const [local, setLocal] = React.useState<{ value: T } | null>(null)
  const { mutate } = useMutation({
    mutationFn: (value: T) =>
      updateProfile({ preferences: { [key]: value ?? null } }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: neosKeys.profile }),
  })
  const value = local
    ? local.value
    : restore(profile?.preferences?.[key] ?? null)
  const set = React.useCallback(
    (next: T) => {
      setLocal({ value: next })
      mutate(next)
    },
    [mutate],
  )
  return [value, set]
}

export function usePinnedPanels(): [string[], (pinned: string[]) => void] {
  return useUserPreference(PINNED_PANELS_PREFERENCE, restorePinned)
}

export function useStructureLayout(): [
  StructureLayout,
  (layout: StructureLayout) => void,
] {
  return useUserPreference(STRUCTURE_PREFERENCE, restoreStructure)
}
