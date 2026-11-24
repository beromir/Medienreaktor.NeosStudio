# The alpha layout

An opt-in redesign of the shell, next to today's layout: dark only, a top
bar, a left rail, the preview as a card with a floating action bar, and
panels on both sides of it. Users switch in the user menu ("Try the new
layout (alpha)") and back in the account menu; the choice is the
`studio.layout` user preference (`classic` | `alpha`), served in the boot
config as `layout`.

The design is work in progress (Paper file "Neos Studio", frames R3-R34).

## Where it lives

- `src/features/shell-alpha/`: the shell (`AlphaShell`), `TopBar`, `Rail`,
  `ActionBar`, the panels (`PagesPanel`, `PropertiesPanel` with the
  `BranchMap`), primitives and icons, and `shell-alpha.css`.
- `src/lib/layoutMode.ts`: the switch.
- `src/features/preview/chromeStore.ts` and `src/guest/`: what the shell
  asks of the preview - minimal in-page chrome, scroll space under the bar,
  the insert line of the Add menu, the device width, the element a shell
  row outlines while hovered (`hoverNode`) - and the guest's scroll and
  pointer reports that fade the bar.
- `src/features/tree/treeStyle.ts`: the alpha tree row (see Trees).

Panels come from the panel registry, plugin panels included: main-region
panels are the rail's modes, the others its panel buttons, opening in the
left column (see Panels). The Documents panel gives way to the shell's own
Pages panel and the page tree dropdown; the Properties panel shows the
Inspector's own fields (`InspectorPanel layout="panel"`). Header actions
sit in the top bar, node actions in the node pill's element menu.

## Panels (R31-R33)

Left is where you go, right is what you selected. The left column holds
Pages, Outline, Clipboard, Trash, then plugin panels and History - one at
a time; opening another replaces it in the same floating or pinned state.
The right side holds the Properties panel and nothing else.

Every panel floats by default: it lies over the preview 14px inside the
card, with a shadow, and the preview keeps its full width, so the site
keeps its real desktop layout. The pin in its header docks it beside the
preview, which narrows instead; with both sides pinned the site may switch
to a narrower layout - the editor's choice. Each panel keeps its pin as
the `studio.alpha.pinnedPanels` user preference (the list of pinned panel
ids), so it holds across sessions and browsers; which panels are open is
kept per browser. A floating panel stays open until it is closed - its ✕,
its rail button (Settings for Properties) or Esc; a click in the page
never closes it. The action bar centres in the part of the preview no
floating panel covers. The rules live in `shell-alpha/dock.ts`.

The Properties panel opens only on purpose: from the node pill's Settings
button, which shows grey while the panel is open. Selecting never opens
it, so the preview does not jump between widths. While open it follows
the selection and shows the page when the page is selected - its title,
URL path and menu visibility first. Its header names the node; the fields
scroll, the branch map stays at the bottom. An element with nothing to set
once the element menu's properties are left out (an untouched content
collection) has no Settings button.

The settings tray of R19-R29 is gone: on centred sites it always covered
what was being edited.

## Selecting

A click on an element selects it. A second click on the selected element
deselects it - the page becomes the selection - unless the element has
text of its own to type in (the guest knows from its inline-editable
properties), where the click places the caret as before. Esc deselects
anywhere; with the page selected, Esc closes the floating panels,
Properties first. Esc always closes an open Add menu or Search first.

The element types listed in the Add menu can be dragged into the page as
well as picked. While one is dragged the menu turns see-through, the
collections that allow the type light up (the guest's `type-drag`), a
line marks the insertion point, and the drop asks the shell to create
the element there (`create-node-request`) - through the creation dialog
when the type has one; the new element is selected.

The Properties panel shows a content element's content settings in the
node type's inspector tabs (`ui.inspector.tabs`, icons from the tab
config, pencil / cog / sliders when none is set), at the top as 32x28
icons at fixed positions, the label as tooltip; a single tab has no tab
row. Every group of the active tab starts open and collapses with its
chevron; only groups configured `collapsed: true` start closed. The node
pill names the node.

The rail's mode switcher, open, always lists Editor, Media, Workspaces,
Tasks (plugin modes after them), the current one highlighted in its own
slot and the chevron last (R21). The open-tasks dot sits on Tasks while
open, on the current mode's button while closed.

## The branch map (R30)

At the bottom of the Properties panel, under a hairline: the branch
around the selection in seven rows of 26px, always the same height, so
nothing moves when the selection does. It hides while the Outline is open,
which shows the whole tree already, and replaces the path menu the panel's
header had (R15).

The rows fill in this order: the path line (the page down to the level
above the parent, folded to the page and the two nearest levels with
"…"); the parent, open; the selection with up to two siblings on either
side and up to three of its children; then the parent's next siblings,
closed. With the page selected: the page and its collections. What does
not fit becomes "+ n more", which opens the Outline. The arrow of the path
line selects the level above the parent, a segment selects that level, a
row selects its element, which scrolls the preview to it; hovering a row
outlines its element in the preview. Closed rows show how many elements
they hold ("3 inside").

## Pages (R33)

The rail's first panel button: the site's document tree with a filter
(the server-side search of the Documents panel), hover actions on each row
(+ a new page inside, ⋯ the page menu), drag to reorder, and "New page"
(inside the current page) at the bottom. Opening a page keeps the panel
open. The breadcrumb's page dropdown shows the same tree for quick jumps
and closes on a pick. Pages and content stay separate panels.

## Trees (R34)

The Outline, Pages and the branch map draw one row: 28px (the map 26px,
12px text), 8px corners, a fixed 10px chevron slot and a 12px type icon
slot, so labels line up at every level, 16px indent per level. The icon is
the node type's own; collections without an icon of their own get a frame
instead of a folder. The selection - in Pages the current page - gets the
blue tint, its icon `shell-accent-pale`; hover a grey fill, and the
trailing note ("n inside" on closed rows once their children are loaded,
"hidden" on hidden ones) gives way to the row's actions: in the Outline
show/hide and ⋯ (the element menu), in Pages + and ⋯. Hovering an Outline
row outlines its element in the preview. The Outline leaves out its root
row; the panel header names the page.

`TreeList` draws these rows when the alpha shell provides the tree style
(`TreeStyleContext`) and the tree passes `alphaRow`; other trees (the
media folders) keep their classic rows inside the alpha layout too.

## The element menu (R25)

What is about the element rather than its content leaves the Properties
panel: Neos' type group (`_nodeType`), visibility (`_hidden` and the timed
`enableAfterDateTime` / `disableAfterDateTime`) and the node info view are
not rendered for content elements; other groups an integrator puts in the
meta tab stay, a page keeps all of them (it has no element menu). They
live in the node pill's "more" menu (`ElementMenu`), opened above the pill
and aligned with its right edge: an info block (type, "Changed by … ·
time" from the workspace's pending events, else the last modification;
the node id to copy; Copy for MCP), then Change type…, Hide / Show,
Schedule… (only with timed visibility), Duplicate, Copy to clipboard,
Delete (confirmed in a dialog) and the node actions of plugins.

Change type… shows the types the node type editor would offer at the
node's position, without the current one, as the Add menu's tiles; picking
one asks in the popover's footer what carries over (properties of the same
name with a value) and what is removed. Schedule… edits the timed
visibility as "Show from" / "Hide after" in a popover of the same style.

A hidden element is faded to 45% in the preview, with a dashed selection
outline (the minimal chrome's styles for the server-rendered
`data-__neos-studio-hidden`), and the node pill shows a "Hidden" tag.

## Controls and the tray grid (R28, R29)

The alpha inspector (the Properties panel) has its own controls; the
classic inspector keeps its own. The selection colour rule: a blue tint
for what is on/off or picked/not picked, grey (`shell-raised`) for one of
many where something is always selected - segmented controls, tabs, view
toggles. Only one solid blue per moment.

- Field labels sit on top, 12px `shell-muted`, never tinted.
- Booleans are switches (`role="switch"`, label to the right): they take
  effect at once. Read-only dims them.
- Checkboxes only pick items for a later action (lists, the publish
  popover). One look, in `shell-alpha.css` on `[data-slot='checkbox']`:
  the Base UI `Checkbox` inside the alpha layout and the shell's
  `CheckboxBox` (a row that is the checkbox itself) share it.
- A static select box with two to four short options (they must fit one
  tray grid column) is a segmented choice; option icons show alone, their label
  as tooltip. Longer, grouped, empty-able, multiple and data source selects
  stay dropdowns.
- Inputs, selects, the date picker (`data-control="field"`) and the
  reference pickers: 32px, 8px corners, `shell-input` with a hairline;
  focus a `shell-focus` border with a 3px `shell-focus-ring`; an error
  a `shell-danger` border and a 12px `shell-danger-text` line under the
  field.
- Multiple references are chips with a dashed "+ Add".
- A property with `scope: nodeAggregate | specializations` carries a quiet
  link icon after its label; its tooltip says "Shared across all languages"
  (or "variants" unless the content varies by language alone), or that it
  also changes the languages or variants based on this one. While such a
  field has focus, a line under it names what the edit changes ("Applies to
  English (US) and English (GB)"), from the node's covered dimension space
  points. Switches commit at once and get no such line.

The tray is gone (R31), but its grid stays in `InspectorPanel
layout="tray"` while `traySpan` is part of the plugin API. In the 600px
tray each group lays its fields on four columns (132px at
14px gaps, 14px side padding). A field spans by its editor's `traySpan`
(`PropertyEditorDefinition`, optional): 1 for segmented choices,
selects and dates, 2 for text fields, URL path segments, the node type and
range editors, the full row (`'row'`) for everything else - text areas,
rich text, images and assets, references, link, code, views and every
editor that does not say. Consecutive switches form one wrapping row of
switch, label and scope icon (24px apart, 10px between rows). Groups stay
sections with a header and a hairline; two consecutive groups that each
need at most two columns share a row, each with its own header and a
vertical hairline in the column gap, so the columns stay aligned. The
rules live in `inspector/trayLayout.ts`. The Properties panel keeps one
field per row.

## Publishing (R24)

The workspace pill's Publish opens a popover under the pill, right-aligned
with it (`PublishPopover`): the active workspace's changed pages of the
site, all checked, each with its parent (or "This page") and a change
summary that turns into "Show" on hover. Discard asks in place in the
footer, never in a second dialog. Without changes it says "Up to date" and
offers the Workspaces mode, where other source/target pairs and the
per-document diffs stay (`ReviewChangesDialog`). A conflict opens the
conflict dialog - the one place that blocks - and turns the pill orange
meanwhile.

Dialogs inside the alpha layout take the new look from `shell-alpha.css`
(surface, scrim, 15px title, 13px text, 32px buttons with 8px corners, red
only for what can't be undone); the conflict dialog has its own alpha
layout. Popovers for everyday actions, dialogs only when the editor must
decide.

Never render keyboard shortcut hints in the alpha layout.

## Native popovers

The Add menu, Search, the page tree dropdown and the publish popover are native popovers
(`NativePopover`: `popover="auto"`, opened by `popoverTarget`), in the
top layer, positioned with CSS anchor positioning or, where a browser lacks
it, measured in JavaScript. The browser closes them on Esc, on a click
outside and when another one opens. The page in the preview is another
document, so the guest relays a pointer down and Esc from there.

The anchoring - anchor names, placement, the measured fallback - is shared
in `shell-alpha/anchoring.ts`.

The shell's tooltip (`shell-alpha/Tooltip.tsx`, `Tooltip` or
`useTooltip`) is a native `popover="hint"`: it never closes an open
`auto` popover, and browsers without `hint` treat it as `manual`. One
shows at a time, centred 6px above its trigger (right of it in the rail),
flipped and kept inside the viewport where there is no room. It opens on
hover after 500ms - at once while another one shows or within 300ms after
one hid - and on keyboard focus, and hides on leave, blur, a press and Esc.
It describes its trigger with `aria-describedby`, or, on an icon-only
button whose `aria-label` says the same, only shows that name. It is
`pointer-events: none`, 22px high on `shell-raised`, 11px text. Every
hint in the alpha shell uses it instead of `title`. The classic layout
and the plugin API keep the Base UI tooltip.

Popups opened from inside one - context menus, the creation dialogs -
portal into the popover (`PortalContainerContext`, used by every
`components/ui` portal), so they stay above it and count as inside for its
light dismiss. Menus, selects and Studio's dialogs stay Base UI: they need
its keyboard handling and roles.

## Tokens to move into the Figma source

`shell-alpha.css` is hand-written because `styles/` is generated by
medienreaktor/figma-tools. Once the design settles, these belong in the
Figma variables:

| Token | Value |
|---|---|
| shell-ground | #262626 |
| shell-surface | #1A1A1A |
| shell-bar | #1A1A1AF2 |
| shell-border / -strong | #FFFFFF0D / #FFFFFF0F |
| shell-divider | #FFFFFF1A |
| shell-input | #0E0E0E |
| shell-hover / -inset | #2F2F2F / #2A2A2A |
| shell-tile / -row / -raised | #232323 / #222222 / #2E2E2E |
| shell-active | #3A3A3A |
| shell-text / quiet / muted / subtle / disabled / faint | #EDEDED / #BDBDBD / #9A9A9A / #8A8A8A / #6A6A6A / #4A4A4A |
| shell-accent / -light / -pale | #00ADEE / #5CC9F5 / #7FD6F7 |
| shell-accent-tint / -tint-strong / -check | #00ADEE33 / #00ADEE4D / #00ADEE40 |
| shell-conflict | #FF8700 |
| shell-danger / -text | #D9434A / #F08A8A |
| shell-focus / -ring | #00ADEE99 / #00ADEE26 |
| shell-switch-track | #333333 |
| shell-icon | #7A7A7A |
| shell-tooltip-border | #FFFFFF14 |
| shell-scrim | #00000099 |
| radius surface / site / control / segment | 16 / 10 / 8 / 5 px (chrome: full) |
| shadow bar / surface / dialog | 0 10px 30px #00000066 / 0 16px 40px #00000066 / 0 24px 60px #00000080 |
| shadow thumb / tooltip | 0 1px 3px #00000080 / 0 4px 10px #00000066 |
| type: control / secondary / count | 13/16, 12/16, 11/14 semibold |

The semantic overrides at the end of the file (background, popover, border,
radius of menus and inputs inside the alpha layout) go away with a proper
dark theme for the new surfaces.
