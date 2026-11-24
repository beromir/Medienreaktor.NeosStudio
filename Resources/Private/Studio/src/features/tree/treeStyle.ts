import { createContext, type ReactNode, useContext } from 'react'

/**
 * How the node trees draw their rows: the classic rows, or the alpha
 * layout's (R34) - one row shared by the Outline, Pages and the branch map.
 */
export type TreeStyle = 'classic' | 'alpha'

export const TreeStyleContext = createContext<TreeStyle>('classic')

export function useTreeStyle(): TreeStyle {
  return useContext(TreeStyleContext)
}

/** What a tree adds to an alpha row beyond its name and chevron. */
export interface AlphaRow {
  /** The type icon, in the 12px slot. */
  icon: ReactNode
  hidden?: boolean
  /** The quiet trailing note ("3 inside", "hidden"). */
  note?: string | null
  /** Shown instead of the note while the row is hovered or focused. */
  actions?: ReactNode
  /** Pointer entered (true) or left (false) the row. */
  onHover?: (hovered: boolean) => void
}
