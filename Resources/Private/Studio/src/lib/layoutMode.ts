import { useSyncExternalStore } from 'react'
import { updateProfile } from '@/api/neos/endpoints/me'
import { config } from '@/config'
import { pinDarkTheme } from './uiMode'

export type LayoutMode = 'classic' | 'alpha'

export const LAYOUT_PREFERENCE = 'studio.layout'

let current: LayoutMode = config.layout === 'alpha' ? 'alpha' : 'classic'
const listeners = new Set<() => void>()

function apply() {
  document.documentElement.dataset.layout = current
  pinDarkTheme(current === 'alpha')
}

/** Apply the boot-config layout before mount (after initUiMode). */
export function initLayoutMode() {
  apply()
}

export function useLayoutMode(): LayoutMode {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => current,
  )
}

/**
 * Switch live and remember the choice in the user's preferences. The switch
 * happens first: a failed save only means the next boot opens the old layout.
 */
export function setLayoutMode(mode: LayoutMode): Promise<unknown> {
  current = mode
  apply()
  listeners.forEach((listener) => listener())
  return updateProfile({ preferences: { [LAYOUT_PREFERENCE]: mode } })
}
