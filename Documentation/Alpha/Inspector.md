# Alpha layout: inspector

Part of the [alpha layout docs](README.md).

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
