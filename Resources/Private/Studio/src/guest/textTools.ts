/**
 * The alpha layout's text tools (R45 C), in place of the two classic bars:
 *
 * - The strip continues the selection's handle tab while the caret is in
 *   text: Paragraph ▾ (the block type), Lists ▾ and ⋯ for the rest of the
 *   paragraph tools - what acts on the paragraph sits with the element.
 * - The marks bubble floats over selected words: Bold, Italic, Link and ⋯
 *   for the other marks - what acts on words sits with the words.
 *
 * Both draw the toolbar registry's items (toolbar.ts), so what a property
 * allows and what plugins add show here as they do in the classic bars;
 * menus without entries leave their button out.
 */
import type { Editor } from '@tiptap/core'
import { actionIconSvg, type ActionIconName, chevronSvg } from '../lib/iconSet'
import { label } from './labels'
import { SELECTION_ID, TAB_ID } from './selectionChrome'
import type { ToolbarItem, ToolbarMenuEntry } from './toolbar'

/** The toolbar registry, handed over by toolbar.ts (which imports this). */
interface ItemSource {
  items(): readonly ToolbarItem[]
  label(item: ToolbarItem): string
  className: string
}

let source: ItemSource = {
  items: () => [],
  label: (item) => item.label,
  className: '',
}

export function connectTextTools(registry: ItemSource): void {
  source = registry
}

const toolbarItems = () => source.items()
const itemLabel = (item: ToolbarItem) => source.label(item)

const STRIP_ID = 'neos-studio-text-strip'
const BUBBLE_ID = 'neos-studio-marks-bubble'
const MENU_ID = 'neos-studio-text-menu'
const HEIGHT = 24
/** Between the bubble and the selection, the outline or the strip. */
const GAP = 6
const EDGE = 4

const FONT = `"Noto Sans", system-ui, -apple-system, sans-serif`

const PARAGRAPH_ITEMS = [
  'paragraph',
  'heading-1',
  'heading-2',
  'heading-3',
  'heading-4',
  'heading-5',
  'heading-6',
  'blockquote',
  'codeBlock',
]
const LIST_ITEMS = ['bulletList', 'orderedList']
/** Indent and outdent stay on Tab and Shift+Tab inside a list. */
const KEYBOARD_ONLY = new Set(['sink', 'lift'])
const MARK_BUTTONS = ['bold', 'italic', 'link']

/** The set's icons for the registry's items; the rest keep their own. */
const SET_ICONS: Record<string, ActionIconName> = {
  bold: 'bold',
  italic: 'italic',
  link: 'link',
  'link-edit': 'link',
  bulletList: 'bulletList',
  orderedList: 'orderedList',
  'align-left': 'alignLeft',
  'align-center': 'alignCenter',
  'align-right': 'alignRight',
  'align-justify': 'alignJustify',
}

function iconOf(item: ToolbarItem): string {
  const own = SET_ICONS[item.id]
  return own ? actionIconSvg(own) : item.icon
}

/** One line of a text tools menu. */
interface MenuLine {
  key: string
  label: string
  icon?: string
  active: boolean
  disabled?: boolean
  preview?: string
  run(editor: Editor): void
}

/** A menu's lines in groups, hairlines between them. */
type MenuGroups = MenuLine[][]

function styles(): string {
  return `
    #${STRIP_ID}, #${BUBBLE_ID} {
      position: fixed;
      z-index: 2147483646;
      display: none;
      align-items: center;
      box-sizing: border-box;
      height: ${HEIGHT}px;
      margin: 0;
      font: 500 12px/16px ${FONT};
      color: #ededed;
      user-select: none;
      -webkit-user-select: none;
    }
    #${STRIP_ID} {
      gap: 1px;
      padding: 0 3px;
      background: #1a1a1a;
      border-radius: 0 6px 0 0;
      box-shadow: 0 6px 18px #00000040;
    }
    #${STRIP_ID}[data-place='below'] {
      border-radius: 0 0 6px 0;
    }
    #${STRIP_ID}[data-alone] {
      border-radius: 6px 6px 0 0;
    }
    #${STRIP_ID}[data-alone][data-place='below'] {
      border-radius: 0 0 6px 6px;
    }
    #${BUBBLE_ID} {
      gap: 0;
      padding: 0 1px;
      background: #1a1a1af2;
      border: 1px solid #ffffff0f;
      border-radius: 12px;
      box-shadow: 0 10px 30px #00000066;
    }
    #${STRIP_ID} button, #${BUBBLE_ID} button, #${MENU_ID} button {
      display: flex;
      align-items: center;
      justify-content: center;
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      border: none;
      background: transparent;
      color: #ededed;
      font: inherit;
      cursor: pointer;
    }
    #${STRIP_ID} button {
      height: 20px;
      border-radius: 4px;
    }
    #${STRIP_ID} .neos-studio-text-paragraph {
      gap: 5px;
      padding: 0 7px 0 8px;
      white-space: nowrap;
    }
    #${STRIP_ID} .neos-studio-text-lists {
      gap: 3px;
      padding: 0 5px 0 6px;
    }
    #${STRIP_ID} .neos-studio-text-more {
      width: 24px;
    }
    #${BUBBLE_ID} button {
      width: 24px;
      height: 20px;
      border-radius: 10px;
    }
    #${STRIP_ID} button:hover, #${BUBBLE_ID} button:hover,
    #${STRIP_ID} button[aria-expanded='true'], #${BUBBLE_ID} button[aria-expanded='true'] {
      background: #2e2e2e;
    }
    #${STRIP_ID} button[aria-pressed='true'], #${BUBBLE_ID} button[aria-pressed='true'] {
      background: #00adee33;
      color: #7fd6f7;
    }
    #${STRIP_ID} svg, #${BUBBLE_ID} svg, #${MENU_ID} svg {
      flex: none;
      width: 14px;
      height: 14px;
    }
    #${STRIP_ID} .neos-studio-text-chevron svg {
      width: 10px;
      height: 10px;
      color: #8a8a8a;
    }
    .neos-studio-text-divider {
      flex: none;
      width: 1px;
      height: 12px;
      margin: 0 2px;
      background: #ffffff1a;
    }
    #${MENU_ID} {
      position: fixed;
      z-index: 2147483647;
      display: none;
      flex-direction: column;
      box-sizing: border-box;
      min-width: 180px;
      max-width: 280px;
      max-height: 320px;
      overflow-y: auto;
      padding: 4px;
      background: #232323;
      border: 1px solid #ffffff14;
      border-radius: 12px;
      box-shadow: 0 12px 30px #00000073;
      font: 400 12px/16px ${FONT};
      color: #ededed;
      user-select: none;
      -webkit-user-select: none;
    }
    #${MENU_ID} button {
      justify-content: flex-start;
      gap: 10px;
      width: 100%;
      min-height: 30px;
      padding: 0 10px;
      border-radius: 8px;
      text-align: left;
      color: #ededed;
    }
    #${MENU_ID} button > svg {
      color: #9a9a9a;
    }
    #${MENU_ID} button:hover {
      background: #2f2f2f;
    }
    #${MENU_ID} button:hover > svg {
      color: #ededed;
    }
    #${MENU_ID} button[aria-checked='true'] {
      background: #00adee33;
      color: #7fd6f7;
    }
    #${MENU_ID} button[aria-checked='true'] > svg {
      color: #7fd6f7;
    }
    #${MENU_ID} button[aria-disabled='true'] {
      opacity: 0.4;
      cursor: default;
    }
    #${MENU_ID} .neos-studio-text-face {
      flex: none;
      width: 14px;
      color: #9a9a9a;
      font-weight: 600;
      text-align: center;
    }
    #${MENU_ID} .neos-studio-text-rule {
      flex: none;
      height: 1px;
      margin: 4px 6px;
      background: #ffffff14;
    }
    #${MENU_ID} .neos-studio-toolbar-preview {
      display: block;
      overflow: hidden;
      width: 100%;
      max-height: 3em;
      padding: 2px 6px;
      border-radius: 3px;
      background: #fff;
      color: #1a1a1a;
      font-size: 12px;
      line-height: 1.4;
    }
    #${MENU_ID} .neos-studio-toolbar-preview * {
      margin: 0;
      font-size: inherit;
      line-height: inherit;
    }
  `
}

let stylesInjected = false
function injectStyles(): void {
  if (stylesInjected) return
  stylesInjected = true
  const style = document.createElement('style')
  style.textContent = styles()
  document.head.appendChild(style)
}

function element(id: string): HTMLElement {
  let found = document.getElementById(id)
  if (!found) {
    injectStyles()
    found = document.createElement('div')
    found.id = id
    found.className = source.className
    found.setAttribute('role', id === MENU_ID ? 'menu' : 'toolbar')
    document.body.appendChild(found)
  }
  return found
}

/** Act on mousedown and keep the editor's focus and selection. */
function onPress(button: HTMLElement, action: () => void): void {
  button.addEventListener('mousedown', (event) => {
    event.preventDefault()
    event.stopPropagation()
    action()
  })
}

function available(editor: Editor, item: ToolbarItem): boolean {
  return !item.isAvailable || item.isAvailable(editor)
}

function itemsById(editor: Editor, ids: string[]): ToolbarItem[] {
  const all = toolbarItems()
  return ids.flatMap((id) => {
    const item = all.find((candidate) => candidate.id === id)
    return item && available(editor, item) ? [item] : []
  })
}

function itemLine(editor: Editor, item: ToolbarItem): MenuLine {
  return {
    key: item.id,
    label: itemLabel(item),
    icon: iconOf(item),
    active: item.isActive(editor),
    disabled: item.isDisabled?.(editor) ?? false,
    run: (target) => item.run(target),
  }
}

/** A picker item (styles) unfolds into its entries. */
function entryLines(entries: ToolbarMenuEntry[]): MenuLine[] {
  return entries.map((entry) => ({ ...entry, key: `entry:${entry.key}` }))
}

/** Every item of a kind that has no place of its own, grouped. */
function restOf(
  editor: Editor,
  kind: ToolbarItem['kind'],
  placed: Set<string>,
): MenuGroups {
  const groups: MenuGroups = []
  let current: { group: string; lines: MenuLine[] } | null = null
  for (const item of toolbarItems()) {
    if (item.kind !== kind || placed.has(item.id)) continue
    if (KEYBOARD_ONLY.has(item.id) || !available(editor, item)) continue
    const lines = item.menu
      ? entryLines(item.menu(editor))
      : [itemLine(editor, item)]
    if (lines.length === 0) continue
    if (current === null || current.group !== item.group) {
      current = { group: item.group, lines: [] }
      groups.push(current.lines)
    }
    current.lines.push(...lines)
  }
  return groups
}

/** What the strip's three buttons hold for the editor right now. */
function stripContent(editor: Editor) {
  const paragraph = itemsById(editor, PARAGRAPH_ITEMS)
  const lists = itemsById(editor, LIST_ITEMS)
  const placed = new Set([...PARAGRAPH_ITEMS, ...LIST_ITEMS])
  const more = restOf(editor, 'block', placed)
  // Clearing marks is about the paragraph too while only the caret is in it.
  const clear = itemsById(editor, ['removeFormat'])
  if (clear.length) more.push(clear.map((item) => itemLine(editor, item)))
  return { paragraph, lists, more }
}

function bubbleContent(editor: Editor) {
  const buttons = itemsById(editor, MARK_BUTTONS)
  const more = restOf(editor, 'inline', new Set(MARK_BUTTONS))
  return { buttons, more }
}

/** The open menu and the button it belongs to. */
let openMenu: { button: HTMLElement; key: string } | null = null
let currentEditor: Editor | null = null

function closeMenu(): void {
  if (!openMenu) return
  openMenu.button.setAttribute('aria-expanded', 'false')
  openMenu = null
  const menu = document.getElementById(MENU_ID)
  if (menu) menu.style.display = 'none'
}

function toggleMenu(
  button: HTMLElement,
  key: string,
  groups: () => MenuGroups,
): void {
  if (openMenu?.key === key) {
    closeMenu()
    return
  }
  closeMenu()
  const editor = currentEditor
  if (!editor) return
  const menu = element(MENU_ID)
  menu.replaceChildren()
  groups()
    .filter((lines) => lines.length > 0)
    .forEach((lines, index) => {
      if (index > 0) {
        const rule = document.createElement('div')
        rule.className = 'neos-studio-text-rule'
        menu.appendChild(rule)
      }
      for (const line of lines) {
        const choice = document.createElement('button')
        choice.type = 'button'
        choice.setAttribute('role', 'menuitemcheckbox')
        choice.setAttribute('aria-checked', String(line.active))
        if (line.disabled) choice.setAttribute('aria-disabled', 'true')
        if (line.preview) {
          const preview = document.createElement('span')
          preview.className = 'neos-studio-toolbar-preview'
          preview.innerHTML = line.preview
          choice.appendChild(preview)
        } else {
          if (line.icon !== undefined) {
            if (line.icon.trimStart().startsWith('<svg')) {
              choice.insertAdjacentHTML('beforeend', line.icon)
            } else {
              const face = document.createElement('span')
              face.className = 'neos-studio-text-face'
              face.innerHTML = line.icon
              choice.appendChild(face)
            }
          }
          const text = document.createElement('span')
          text.textContent = line.label
          choice.appendChild(text)
        }
        onPress(choice, () => {
          if (line.disabled || !currentEditor) return
          closeMenu()
          line.run(currentEditor)
          refresh()
        })
        menu.appendChild(choice)
      }
    })
  openMenu = { button, key }
  button.setAttribute('aria-expanded', 'true')
  menu.style.display = 'flex'
  placeMenu(menu, button.getBoundingClientRect())
}

/** Under its button, or over it where the page has no room below. */
function placeMenu(menu: HTMLElement, anchor: DOMRect): void {
  const width = menu.offsetWidth
  const height = menu.offsetHeight
  const left = Math.max(
    EDGE,
    Math.min(anchor.left, window.innerWidth - width - EDGE),
  )
  const below = anchor.bottom + 4
  const top =
    below + height > window.innerHeight - EDGE && anchor.top - 4 - height > 0
      ? anchor.top - 4 - height
      : below
  menu.style.left = `${left}px`
  menu.style.top = `${top}px`
}

function button(className: string, text: string): HTMLButtonElement {
  const created = document.createElement('button')
  created.type = 'button'
  created.className = className
  created.setAttribute('aria-label', text)
  created.title = text
  return created
}

function divider(): HTMLElement {
  const rule = document.createElement('span')
  rule.className = 'neos-studio-text-divider'
  return rule
}

/** The strip's and the bubble's contents, rebuilt when they change. */
let stripSignature: string | null = null
let bubbleSignature: string | null = null

function signature(parts: unknown): string {
  return JSON.stringify(parts)
}

function renderStrip(editor: Editor): boolean {
  const strip = element(STRIP_ID)
  const { paragraph, lists, more } = stripContent(editor)
  const current =
    paragraph.find((item) => item.isActive(editor)) ??
    paragraph.find((item) => item.id === 'paragraph')
  const listActive = lists.find((item) => item.isActive(editor))
  const parts = {
    paragraph: paragraph.map((item) => item.id),
    label: current
      ? itemLabel(current)
      : label('textTools.paragraph', 'Paragraph'),
    lists: lists.map((item) => item.id),
    list: listActive?.id ?? null,
    more: more.map((lines) => lines.map((line) => line.key)),
  }
  const next = signature(parts)
  if (next === stripSignature) return strip.childElementCount > 0
  stripSignature = next
  closeMenu()
  strip.replaceChildren()
  const sections: HTMLElement[] = []
  if (paragraph.length > 0) {
    const pick = button(
      'neos-studio-text-paragraph',
      label('textTools.paragraphStyle', 'Paragraph style'),
    )
    const text = document.createElement('span')
    text.textContent = parts.label
    const chevron = document.createElement('span')
    chevron.className = 'neos-studio-text-chevron'
    chevron.innerHTML = chevronSvg('down')
    pick.append(text, chevron)
    pick.setAttribute('aria-haspopup', 'menu')
    onPress(pick, () =>
      toggleMenu(pick, 'paragraph', () =>
        currentEditor
          ? [paragraph.map((item) => itemLine(currentEditor!, item))]
          : [],
      ),
    )
    sections.push(pick)
  }
  if (lists.length > 0) {
    const pick = button(
      'neos-studio-text-lists',
      label('textTools.lists', 'Lists'),
    )
    pick.innerHTML = `${actionIconSvg(listActive?.id === 'orderedList' ? 'orderedList' : 'bulletList')}<span class="neos-studio-text-chevron">${chevronSvg('down')}</span>`
    pick.setAttribute('aria-haspopup', 'menu')
    pick.setAttribute('aria-pressed', String(listActive !== undefined))
    onPress(pick, () =>
      toggleMenu(pick, 'lists', () =>
        currentEditor
          ? [lists.map((item) => itemLine(currentEditor!, item))]
          : [],
      ),
    )
    sections.push(pick)
  }
  if (more.length > 0) {
    const pick = button(
      'neos-studio-text-more',
      label('textTools.more', 'More'),
    )
    pick.innerHTML = actionIconSvg('more')
    pick.setAttribute('aria-haspopup', 'menu')
    onPress(pick, () =>
      toggleMenu(pick, 'strip-more', () =>
        currentEditor ? stripContent(currentEditor).more : [],
      ),
    )
    sections.push(pick)
  }
  sections.forEach((section, index) => {
    if (index > 0) strip.appendChild(divider())
    strip.appendChild(section)
  })
  return sections.length > 0
}

function renderBubble(editor: Editor): boolean {
  const bubble = element(BUBBLE_ID)
  const { buttons, more } = bubbleContent(editor)
  const parts = {
    buttons: buttons.map((item) => [item.id, item.isActive(editor)]),
    more: more.map((lines) => lines.map((line) => line.key)),
  }
  const next = signature(parts)
  if (next === bubbleSignature) return bubble.childElementCount > 0
  bubbleSignature = next
  closeMenu()
  bubble.replaceChildren()
  for (const item of buttons) {
    const press = button('', itemLabel(item))
    press.innerHTML = iconOf(item)
    press.setAttribute('aria-pressed', String(item.isActive(editor)))
    onPress(press, () => {
      closeMenu()
      if (!currentEditor || item.isDisabled?.(currentEditor)) return
      item.run(currentEditor)
      refresh()
    })
    bubble.appendChild(press)
  }
  if (more.length > 0) {
    if (buttons.length > 0) bubble.appendChild(divider())
    const pick = button('', label('textTools.moreMarks', 'More formatting'))
    pick.innerHTML = actionIconSvg('more')
    pick.setAttribute('aria-haspopup', 'menu')
    onPress(pick, () =>
      toggleMenu(pick, 'bubble-more', () =>
        currentEditor ? bubbleContent(currentEditor).more : [],
      ),
    )
    bubble.appendChild(pick)
  }
  return bubble.childElementCount > 0
}

/** The selection's outline and tab as drawn right now. */
function anchors(): {
  outline: DOMRect | null
  tab: HTMLElement | null
  below: boolean
} {
  const outline = document.getElementById(SELECTION_ID)
  const tab = document.getElementById(TAB_ID)
  const outlineShown = outline !== null && outline.style.display !== 'none'
  const tabShown = tab !== null && tab.style.display !== 'none'
  return {
    outline: outlineShown ? outline.getBoundingClientRect() : null,
    tab: tabShown ? tab : null,
    below: tabShown && tab.dataset.place === 'below',
  }
}

/** The strip continues the tab; without one it sits on the outline alone. */
function placeStrip(strip: HTMLElement, editor: Editor): DOMRect | null {
  const { outline, tab, below } = anchors()
  const editable = editor.view.dom.getBoundingClientRect()
  const frame = outline ?? editable
  const tabRect = tab?.getBoundingClientRect() ?? null
  const place =
    tabRect !== null
      ? below
        ? 'below'
        : 'above'
      : frame.top < HEIGHT
        ? 'below'
        : 'above'
  strip.dataset.place = place
  strip.toggleAttribute('data-alone', tabRect === null)
  tab?.toggleAttribute('data-attached', true)
  const left = tabRect ? tabRect.right : frame.left
  const top = tabRect
    ? tabRect.top
    : place === 'below'
      ? frame.bottom
      : frame.top - HEIGHT
  strip.style.left = `${left}px`
  strip.style.top = `${top}px`
  return strip.getBoundingClientRect()
}

/**
 * Above the selection, or below it where there is no room or it would
 * touch the strip; never on the outline.
 */
function placeBubble(bubble: HTMLElement, strip: DOMRect | null): void {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return
  const range = selection.getRangeAt(0).getBoundingClientRect()
  const { outline } = anchors()
  const width = bubble.offsetWidth
  const left = Math.max(
    EDGE,
    Math.min(
      range.left + range.width / 2 - width / 2,
      window.innerWidth - width - EDGE,
    ),
  )
  const crossesOutline = (top: number, edge: number) =>
    top < edge && top + HEIGHT > edge - 2
  const touches = (top: number) =>
    strip !== null &&
    left < strip.right + GAP &&
    left + width > strip.left - GAP &&
    top < strip.bottom + GAP &&
    top + HEIGHT > strip.top - GAP

  let above = range.top - GAP - HEIGHT
  if (outline && crossesOutline(above, outline.top + 2))
    above = outline.top - GAP - HEIGHT
  let top = above
  if (above < EDGE || touches(above)) {
    let below = range.bottom + GAP
    if (outline && crossesOutline(below, outline.bottom))
      below = outline.bottom + GAP
    top = below
  }
  bubble.style.left = `${left}px`
  bubble.style.top = `${top}px`
}

function hideElement(id: string): void {
  const found = document.getElementById(id)
  if (found) found.style.display = 'none'
}

/** Show the tools for the editor's caret or range. */
export function showTextTools(editor: Editor, range: boolean): void {
  currentEditor = editor
  const strip = element(STRIP_ID)
  const bubble = element(BUBBLE_ID)
  const hasStrip = renderStrip(editor)
  strip.style.display = hasStrip ? 'flex' : 'none'
  const stripRect = hasStrip ? placeStrip(strip, editor) : null
  if (!hasStrip)
    document.getElementById(TAB_ID)?.removeAttribute('data-attached')
  if (range && renderBubble(editor)) {
    bubble.style.display = 'flex'
    placeBubble(bubble, stripRect)
  } else {
    hideElement(BUBBLE_ID)
    if (openMenu?.key === 'bubble-more') closeMenu()
  }
  if (openMenu && !openMenu.button.isConnected) closeMenu()
}

export function hideTextTools(): void {
  currentEditor = null
  closeMenu()
  hideElement(STRIP_ID)
  hideElement(BUBBLE_ID)
  document.getElementById(TAB_ID)?.removeAttribute('data-attached')
}

/** Follow the tab and the selection (scrolling, the tab redrawn). */
export function repositionTextTools(): void {
  const editor = currentEditor
  if (!editor) return
  const strip = document.getElementById(STRIP_ID)
  const stripRect =
    strip && strip.style.display !== 'none' ? placeStrip(strip, editor) : null
  const bubble = document.getElementById(BUBBLE_ID)
  if (bubble && bubble.style.display !== 'none') placeBubble(bubble, stripRect)
  if (openMenu) {
    const menu = document.getElementById(MENU_ID)
    if (menu) placeMenu(menu, openMenu.button.getBoundingClientRect())
  }
}

/** A command ran: active states and labels may have changed. */
function refresh(): void {
  const editor = currentEditor
  if (!editor) return
  stripSignature = null
  bubbleSignature = null
  showTextTools(editor, !editor.state.selection.empty)
}

/** The labels changed: rebuild on the next show. */
export function relabelTextTools(): void {
  stripSignature = null
  bubbleSignature = null
  hideTextTools()
}
