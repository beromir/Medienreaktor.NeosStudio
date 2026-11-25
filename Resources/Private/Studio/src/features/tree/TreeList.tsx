import type { ItemInstance, TreeInstance } from '@headless-tree/core'
import { cn } from '@/lib/utils'
import { Placeholder } from '@/components/ui/placeholder'
import { Skeleton } from '@/components/ui/skeleton'
import type { TreeRowDecor } from './nodeDecor'
import { Chevron } from '@/features/shell-alpha/icons'
import { type AlphaRow, useTreeStyle } from './treeStyle'

/**
 * The drag-and-drop feature's additions to the tree/item instances, absent
 * from the core types the generic TreeList is written against. Present only
 * when a tree registers `dragAndDropFeature`; guarded before use.
 */
type DndTree = { getDragLineStyle: () => React.CSSProperties }
type DndItem = { isUnorderedDragTarget: () => boolean }

/**
 * Shared presentational renderer for headless-tree instances: flat item list
 * with indentation, expand arrows, selection/focus states, and optional row
 * decorations (type icon, state markers, dimming).
 */
export function TreeList<T>({
  tree,
  label,
  emptyText,
  emptyIcon,
  loading = false,
  loadingText,
  decorate,
  onItemContextMenu,
  selectOnContextMenu = false,
  rootless = false,
  alphaRow,
  hideRoot = false,
  selectionLook = 'selection',
}: {
  tree: TreeInstance<T>
  /** Accessible tree label (aria-label on the container). */
  label: string
  /** Message shown, centered, when the tree has no items and isn't loading. */
  emptyText: string
  /** Optional FontAwesome icon (e.g. "fa-folder-open") for the empty state. */
  emptyIcon?: string
  /**
   * While true, an empty tree shows skeleton rows instead of the empty
   * placeholder - for trees whose root children are still loading in.
   */
  loading?: boolean
  /** Screen-reader announcement while the skeleton rows show. */
  loadingText?: string
  /** Row decorations for an item's data; return null for undecorated rows. */
  decorate?: (data: T) => TreeRowDecor | null
  /** Right-click on a row; when set, the browser menu is suppressed. */
  onItemContextMenu?: (item: ItemInstance<T>, event: React.MouseEvent) => void
  /**
   * Right-clicking a row outside the current selection first makes it the
   * selection (and the shift anchor), file-manager style - for trees whose
   * context menu acts on the selected rows. Off by default: a tree whose
   * selection mirrors outside state (e.g. the media tree's active filter)
   * must not have a right-click desync the highlight.
   */
  selectOnContextMenu?: boolean
  /**
   * For forests (many top-level items) rather than a single visible root:
   * level-0 rows keep their expand arrow and indent from level 0, instead of
   * the root special-casing the document tree/outliner rely on.
   */
  rootless?: boolean
  /**
   * The row's extras in the alpha layout (see treeStyle); without it the
   * tree keeps its classic rows there too.
   */
  alphaRow?: (item: ItemInstance<T>) => AlphaRow | null
  /** Alpha rows only: leave the visible root out (a panel header names it). */
  hideRoot?: boolean
  /**
   * Alpha rows only: how the selected row shows - the selection's blue
   * tint, or the grey fill of the current page (one of many).
   */
  selectionLook?: 'selection' | 'current'
}) {
  const alpha = useTreeStyle() === 'alpha' && alphaRow !== undefined
  const allItems = tree.getItems()
  const items =
    alpha && hideRoot && !rootless
      ? allItems.filter((item) => item.getItemMeta().level > 0)
      : allItems
  const isEmpty = items.length === 0
  // Present only when the tree registered the drag-and-drop feature.
  const dnd = 'getDragLineStyle' in tree ? (tree as unknown as DndTree) : null

  return (
    <div
      {...tree.getContainerProps(label)}
      className={cn(
        'flex flex-col outline-none select-none',
        alpha && 'gap-0.5',
        // Fill the container so the empty/loading block centers vertically.
        isEmpty && 'min-h-0 flex-1',
      )}
    >
      {isEmpty &&
        (loading ? (
          <TreeListSkeleton label={loadingText} />
        ) : (
          <Placeholder icon={emptyIcon} title={emptyText} />
        ))}
      {dnd && (
        // Reorder indicator between rows; getDragLineStyle hides it (display:
        // none) when the current drop target is "into" a folder instead.
        <div
          className="pointer-events-none z-10 h-0.5 rounded-full bg-primary"
          style={dnd.getDragLineStyle()}
        />
      )}
      {items.map((item) => {
        if (alpha)
          return (
            <AlphaTreeRow
              key={item.getId()}
              tree={tree}
              item={item}
              row={alphaRow(item)}
              markers={decorate?.(item.getItemData())?.markers}
              indent={
                item.getItemMeta().level - (hideRoot && !rootless ? 1 : 0)
              }
              onItemContextMenu={onItemContextMenu}
              selectOnContextMenu={selectOnContextMenu}
              selectionLook={selectionLook}
            />
          )
        const decor = decorate?.(item.getItemData()) ?? null
        // The tree's visible root (the site or the outlined document) isn't
        // collapsible - it has no sibling to collapse to, so no arrow, and
        // its row starts flush left instead of leaving room for one. Its
        // level costs no indentation, so the rest of the tree shifts left
        // by one level too, rather than sitting an extra step in from it.
        const level = item.getItemMeta().level
        const isRoot = !rootless && level === 0
        const indentLevel = rootless ? level : Math.max(level - 1, 0)
        // Highlight a folder being dropped directly onto ("make child"); the
        // between-rows case is shown by the drag line instead.
        const isDropTarget =
          'isUnorderedDragTarget' in item &&
          (item as unknown as DndItem).isUnorderedDragTarget()
        return (
          <button
            {...item.getProps()}
            key={item.getId()}
            onClick={(e) => clickRow(tree, item, e)}
            onContextMenu={
              onItemContextMenu &&
              ((e) => {
                e.preventDefault()
                // File-manager semantics: right-clicking a row outside the
                // current selection makes it the selection (and the shift
                // anchor), right-clicking inside it keeps the selection - so
                // the menu always acts on the highlighted rows.
                if (selectOnContextMenu && !item.isSelected()) {
                  tree.setSelectedItems([item.getId()])
                  tree.getDataRef<{
                    selectUpToAnchorId?: string
                  }>().current.selectUpToAnchorId = item.getId()
                }
                onItemContextMenu(item, e)
              })
            }
            className={cn(
              'flex w-full items-center gap-1 overflow-hidden whitespace-nowrap rounded-sm border border-transparent py-0.5 pr-1.5 text-left type-body transition-colors hover:bg-accent motion-safe:animate-tree-row-in',
              item.isSelected() && 'border-primary bg-accent',
              item.isFocused() && 'outline-0',
              isDropTarget && 'border-primary bg-primary-tint',
            )}
            style={{ paddingLeft: `${indentLevel * 0.875 + 0.125}rem` }}
          >
            {!isRoot && (
              <span
                className={cn(
                  'flex size-4.5 shrink-0 items-center justify-center rounded-sm type-small text-muted-foreground',
                  item.isFolder() && 'hover:bg-accent hover:text-foreground',
                )}
                onClick={(e) => {
                  e.stopPropagation()
                  if (!item.isFolder()) return
                  if (item.isExpanded()) {
                    item.collapse()
                  } else {
                    item.expand()
                  }
                }}
              >
                {item.isFolder() ? (
                  <i
                    className={cn(
                      'fas fa-caret-right fa-fw type-icon-m transition-transform duration-150',
                      item.isExpanded() && 'rotate-90',
                    )}
                    aria-hidden
                  />
                ) : (
                  ''
                )}
              </span>
            )}
            {decor?.icon && (
              <span className="shrink-0 text-foreground">{decor.icon}</span>
            )}
            {/* Not isLoading(): that also covers children-loading, which
                would swap an expanding folder's own label out for a skeleton
                and blink it back in once the children arrive. */}
            {!item.hasLoadedData() ? (
              <Skeleton
                className="h-3 max-w-full"
                style={{ width: `${skeletonWidth(item.getId())}px` }}
              />
            ) : (
              <span
                className={cn(
                  'overflow-hidden text-ellipsis motion-safe:animate-fade-in',
                  decor?.dimmed && 'opacity-50',
                )}
                style={{ color: decor?.color, opacity: decor?.opacity }}
              >
                {item.getItemName()}
              </span>
            )}
            {decor?.markers && (
              <span className="ml-auto flex shrink-0 items-center gap-1 pl-2 text-muted-foreground">
                {decor.markers}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

/**
 * Label width for a row whose data is still loading, derived from the item id
 * so it stays put across re-renders instead of jumping around.
 */
function skeletonWidth(id: string) {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0
  return 64 + (Math.abs(hash) % 72)
}

/**
 * Placeholder while a tree's root children load: a plausible mini-hierarchy
 * of skeleton rows, fading out toward the bottom. Row geometry (indent step,
 * icon size, spacing) mirrors the real rows so the loaded tree replaces it
 * without a layout jump.
 */
const SKELETON_ROWS = [
  { level: 0, width: '6rem' },
  { level: 1, width: '8rem' },
  { level: 2, width: '5.5rem' },
  { level: 2, width: '7rem' },
  { level: 1, width: '4.5rem' },
  { level: 1, width: '6.5rem' },
]

function TreeListSkeleton({ label }: { label?: string }) {
  return (
    <div role="status" className="motion-safe:animate-fade-in">
      {label && <span className="sr-only">{label}</span>}
      {SKELETON_ROWS.map((row, index) => (
        <div
          key={index}
          className="flex h-5.5 items-center gap-1.5"
          style={{
            paddingLeft: `${row.level * 0.875 + 0.25}rem`,
            opacity: 1 - index * 0.13,
          }}
        >
          <Skeleton className="size-3.5 shrink-0" />
          <Skeleton className="h-3" style={{ width: row.width }} />
        </div>
      ))}
    </div>
  )
}

/**
 * headless-tree's composed row click (selection, focus, primary action)
 * without its expand toggle: clicking a row never expands or collapses it,
 * only the chevron does.
 */
function clickRow<T>(
  tree: TreeInstance<T>,
  item: ItemInstance<T>,
  e: React.MouseEvent,
) {
  if (e.shiftKey) {
    item.selectUpTo(e.ctrlKey || e.metaKey)
  } else if (e.ctrlKey || e.metaKey) {
    item.toggleSelect()
  } else {
    tree.setSelectedItems([item.getId()])
  }
  if (!e.shiftKey) {
    // Internal anchor bookkeeping the selection feature does on click;
    // kept so shift-range selection anchors correctly.
    tree.getDataRef<{
      selectUpToAnchorId?: string
    }>().current.selectUpToAnchorId = item.getId()
  }
  item.setFocused()
  item.primaryAction()
}

function toggleExpanded<T>(item: ItemInstance<T>, e: React.MouseEvent) {
  e.stopPropagation()
  if (!item.isFolder()) return
  if (item.isExpanded()) item.collapse()
  else item.expand()
}

/**
 * The alpha layout's tree row (R34): 28px, fixed chevron and type icon
 * slots, 16px indent per level, a quiet note that gives way to the row's
 * actions on hover.
 */
function AlphaTreeRow<T>({
  tree,
  item,
  row,
  markers,
  indent,
  onItemContextMenu,
  selectOnContextMenu,
  selectionLook,
}: {
  tree: TreeInstance<T>
  item: ItemInstance<T>
  row: AlphaRow | null
  markers: React.ReactNode
  indent: number
  onItemContextMenu?: (item: ItemInstance<T>, event: React.MouseEvent) => void
  selectOnContextMenu: boolean
  selectionLook: 'selection' | 'current'
}) {
  const selected = item.isSelected()
  const current = selected && selectionLook === 'current'
  const isDropTarget =
    'isUnorderedDragTarget' in item &&
    (item as unknown as DndItem).isUnorderedDragTarget()
  return (
    <button
      {...item.getProps()}
      onClick={(e) => clickRow(tree, item, e)}
      onMouseEnter={() => row?.onHover?.(true)}
      onMouseLeave={() => row?.onHover?.(false)}
      onContextMenu={
        onItemContextMenu &&
        ((e) => {
          e.preventDefault()
          if (selectOnContextMenu && !selected) {
            tree.setSelectedItems([item.getId()])
            tree.getDataRef<{
              selectUpToAnchorId?: string
            }>().current.selectUpToAnchorId = item.getId()
          }
          onItemContextMenu(item, e)
        })
      }
      className={cn(
        'group/row flex h-7 w-full shrink-0 items-center gap-1.5 overflow-hidden rounded-shell-control pr-2 text-left type-shell-control whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-shell-accent/60 motion-safe:animate-tree-row-in',
        row?.actions && 'hover:pr-1 focus-within:pr-1',
        current
          ? 'bg-shell-raised font-semibold text-shell-text'
          : selected
            ? 'bg-shell-accent-tint font-medium text-shell-text'
            : row?.hidden
              ? 'text-shell-icon hover:bg-shell-ground'
              : 'text-shell-text hover:bg-shell-ground',
        isDropTarget && 'ring-2 ring-shell-accent/60',
      )}
      style={{ paddingLeft: `${0.5 + indent}rem` }}
    >
      <span
        className="flex w-2.5 shrink-0 justify-center"
        onClick={(e) => toggleExpanded(item, e)}
      >
        {item.isFolder() && (
          <Chevron direction={item.isExpanded() ? 'down' : 'right'} />
        )}
      </span>
      <span
        className={cn(
          'flex w-3 shrink-0 justify-center text-[0.75rem] leading-none',
          current
            ? 'text-shell-text'
            : selected
              ? 'text-shell-accent-pale'
              : row?.hidden
                ? 'text-shell-disabled'
                : 'text-shell-muted',
        )}
      >
        {row?.icon}
      </span>
      {!item.hasLoadedData() ? (
        <Skeleton
          className="h-3 max-w-full"
          style={{ width: `${skeletonWidth(item.getId())}px` }}
        />
      ) : (
        <span className="min-w-0 flex-1 truncate">{item.getItemName()}</span>
      )}
      {markers && (
        <span className="flex shrink-0 items-center gap-1">{markers}</span>
      )}
      {row?.note && (
        <span
          className={cn(
            'shrink-0 text-[0.6875rem] leading-4 font-normal',
            row.hidden ? 'text-shell-disabled' : 'text-shell-icon',
            row.actions &&
              'group-hover/row:hidden group-focus-within/row:hidden',
          )}
        >
          {row.note}
        </span>
      )}
      {row?.actions && (
        <span className="-mr-1 hidden shrink-0 items-center group-hover/row:flex group-focus-within/row:flex">
          {row.actions}
        </span>
      )}
    </button>
  )
}
