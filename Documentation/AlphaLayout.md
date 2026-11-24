# The alpha layout

An opt-in redesign of the shell, next to today's layout: dark only, a top
bar, a left rail, one docked panel and the preview as a card with a
floating action bar. Users switch in the user menu ("Try the new layout
(alpha)") and back in the account menu; the choice is the `studio.layout`
user preference (`classic` | `alpha`), served in the boot config as
`layout`.

The design is work in progress (Paper file "Neos Studio", frames R3-R29).

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
bar, node actions in the node pill's "more" menu.

## Editing (the "Candidate" frames, R19-R23)

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

The tray and the Properties panel show the node type's inspector tabs
(`ui.inspector.tabs`) as muted pills: the active tab with icon and label,
the others icon only, their label as tooltip. Every group of the active tab
starts open and collapses with its chevron; only groups configured
`collapsed: true` start closed. The tray lays the fields on a grid (see
Controls and the tray grid); the image editor shows there as a compact
row (thumbnail, file name, size, Crop, Replace). The tray's header holds only
the tabs, "Keep open" and close - the node pill names the node.
`InspectorPanel layout="panel" | "tray"` renders both; the classic
inspector is the same component without `layout`.

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

## Controls and the tray grid (R28, R29)

The alpha inspector (tray and Properties panel) has its own controls; the
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
  tray column) is a segmented choice; option icons show alone, their label
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

In the 600px tray each group lays its fields on four columns (132px at
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
`pointer-events: none`, 22px high on `shell-raised`, 11px text. The
classic layout and the plugin API keep the Base UI tooltip.

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
