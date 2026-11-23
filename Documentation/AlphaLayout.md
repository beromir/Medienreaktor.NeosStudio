# The alpha layout

An opt-in redesign of the shell, next to today's layout: dark only, a top
bar, a left rail, one docked panel and the preview as a card with a
floating action bar. Users switch in the user menu ("Try the new layout
(alpha)") and back in the account menu; the choice is the `studio.layout`
user preference (`classic` | `alpha`), served in the boot config as
`layout`.

The design is work in progress (Paper file "Neos Studio", frames R3-R27).

## Where it lives

- `src/features/shell-alpha/`: the shell (`AlphaShell`), `TopBar`, `Rail`,
  `ActionBar`, primitives and icons, and `shell-alpha.css`.
- `src/lib/layoutMode.ts`: the switch.
- `src/features/preview/chromeStore.ts` and `src/guest/chrome.ts`: what the
  shell asks of the preview - minimal in-page chrome (no element handle, no
  "+" buttons, a thin selection outline), scroll space under the bar, the
  insert line of the Add menu, the device width - and the guest's scroll and
  pointer reports that fade the bar.

Panels come from the panel registry, plugin panels included: main-region
panels are the rail's modes, the others its panel buttons, docked between
rail and preview (see Editing for the pin). The Documents panel is the
page tree dropdown; the settings tray and the Properties panel show the
Inspector's own fields (`InspectorPanel layout`). Header actions sit in the top
bar, node actions in the node pill's element menu.

## Editing (the "Candidate" frames, R19-R27)

Selecting an element with text to type in the preview (an inline-editable
property the element renders, as the guest reports it with
`selection-text`) leaves the settings tray as it is; selecting one with
nothing to type (an image, columns, a plugin) opens it. Once open, the tray
follows every selection until it is closed (Esc, a click on empty page
space, its close button). The node pill's labelled Settings button always
opens it, and shows grey while the tray or the Properties panel shows the
node. Whether selection may open the tray at all is the
`studio.alpha.trayOnSelection` user preference (on unless false), switched
in the account menu.

The tray and the Properties panel show a content element's content
settings in the node type's inspector tabs (`ui.inspector.tabs`, icons
from the tab config, pencil / cog / sliders when none is set). The tabs
never move (R27): the tray puts them - icon and label, the active one
filled - in one 48px row at its bottom together with "Keep open" and
close; the tray grows upward with the content, so that row stays right
above the action bar. A single tab leaves the row with only its buttons.
The panel keeps them at the top as 32x28 icons at fixed positions, the
label as tooltip, and drops the row for a single tab. Every group of the
active tab starts open and collapses with its chevron; only groups
configured `collapsed: true` start closed. In the 600px tray each group's
fields share rows in fixed columns (176 / 176 / rest, aligned across
groups); wide editors (image, asset, references, text areas, code, rich
text, views and plugin editors) take a full row, the image editor as a
compact row (thumbnail, file name, size, Crop, Replace). The node pill
names the node. `InspectorPanel layout="panel" | "tray"` renders both; the
classic inspector is the same component without `layout`.

Docked panels sit between rail and preview, one at a time. Each header has
a pin: a pinned panel stays, the next one opens beside it (between it and
the preview) and further ones replace that second panel - two at most, one
pin. Pinning the other panel moves the pin; panels never move, the preview
gets narrower instead. The tray's "Keep open" is the same pin: it docks
the Properties panel pinned. The rules live in `shell-alpha/dock.ts`. The
Properties panel follows the selection and, with nothing selected, shows
the page - its title, URL path and menu visibility first. Its header opens
the path menu (parents, the node, its children), as does the node button
of the action bar.

The rail's mode switcher, open, always lists Editor, Media, Workspaces,
Tasks (plugin modes after them), the current one highlighted in its own
slot and the chevron last (R21). The open-tasks dot sits on Tasks while
open, on the current mode's button while closed.

## The element menu (R25)

What is about the element rather than its content leaves the tray and the
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
| shell-scrim | #00000099 |
| radius surface / site / control / segment | 16 / 10 / 8 / 5 px (chrome: full) |
| shadow bar / surface / dialog | 0 10px 30px #00000066 / 0 16px 40px #00000066 / 0 24px 60px #00000080 |
| type: control / secondary / count | 13/16, 12/16, 11/14 semibold |

The semantic overrides at the end of the file (background, popover, border,
radius of menus and inputs inside the alpha layout) go away with a proper
dark theme for the new surfaces.
