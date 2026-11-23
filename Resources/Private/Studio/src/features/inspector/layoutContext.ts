import { createContext, useContext } from 'react'

/**
 * Where the inspector renders: the classic inspector, or the alpha layout's
 * Properties panel or settings tray - editors with a large default look
 * (the image preview) lay themselves out as a row in the tray.
 */
export type InspectorLayout = 'full' | 'panel' | 'tray'

export const InspectorLayoutContext = createContext<InspectorLayout>('full')

export function useInspectorLayout(): InspectorLayout {
  return useContext(InspectorLayoutContext)
}
