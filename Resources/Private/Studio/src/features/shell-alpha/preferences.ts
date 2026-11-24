import { useMutation } from '@tanstack/react-query'
import { updateProfile, useProfile } from '@/api/neos/endpoints/me'
import { neosKeys } from '@/api/neos/keys'
import { queryClient } from '@/app/queryClient'
import { restorePinned } from './dock'

/** The panels the editor pinned (docked); the others float. */
export const PINNED_PANELS_PREFERENCE = 'studio.alpha.pinnedPanels'

export function usePinnedPanels(): [string[], (pinned: string[]) => void] {
  const { data: profile } = useProfile()
  const mutation = useMutation({
    mutationFn: (pinned: string[]) =>
      updateProfile({ preferences: { [PINNED_PANELS_PREFERENCE]: pinned } }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: neosKeys.profile }),
  })
  const pinned = mutation.isPending
    ? mutation.variables
    : restorePinned(profile?.preferences?.[PINNED_PANELS_PREFERENCE])
  return [pinned, (next) => mutation.mutate(next)]
}
