import { useMutation } from '@tanstack/react-query'
import { updateProfile, useProfile } from '@/api/neos/endpoints/me'
import { neosKeys } from '@/api/neos/keys'
import { queryClient } from '@/app/queryClient'

/**
 * Whether selecting a node opens the settings tray (the default), or only
 * the Settings button does - a user preference, to compare the two.
 */
export const TRAY_ON_SELECTION_PREFERENCE = 'studio.alpha.trayOnSelection'

export function useTrayOnSelection(): [boolean, (value: boolean) => void] {
  const { data: profile } = useProfile()
  const mutation = useMutation({
    mutationFn: (value: boolean) =>
      updateProfile({ preferences: { [TRAY_ON_SELECTION_PREFERENCE]: value } }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: neosKeys.profile }),
  })
  const stored = profile?.preferences?.[TRAY_ON_SELECTION_PREFERENCE]
  const value = mutation.isPending ? mutation.variables : stored !== false
  return [value, (next) => mutation.mutate(next)]
}
