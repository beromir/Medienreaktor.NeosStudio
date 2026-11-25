# The alpha layout

An opt-in redesign of the shell, next to today's layout: dark only, a top
bar, a left rail, the preview as a card with a floating action bar, and
panels on both sides of it. Users switch in the user menu ("Try the new
layout (alpha)") and back in the account menu; the choice is the
`studio.layout` user preference (`classic` | `alpha`), served in the boot
config as `layout`.

The design is work in progress (Paper file "Neos Studio", frames R3-R45;
the Editor part of milestone M1).

## Docs by area

Read only the one you need:

- [Panels](Panels.md): the docked left column (Pages and Outline, the
  tree rows) and the floating Properties panel with its path menu and tabs.
- [Editing](Editing.md): selecting, the selection outline and its handle,
  drag and drop, the text tools.
- [Inspector](Inspector.md): the element menu, the alpha field controls,
  the tray grid kept for the plugin API.
- [Publishing](Publishing.md): the publish popover and the dialogs' look.
- [Search](Search.md): the search dialog.
- [Foundations](Foundations.md): the icon set, native popovers and the
  tooltip, the tokens to move into the Figma source.

## Where it lives

- `src/features/shell-alpha/`: the shell (`AlphaShell`), `TopBar`, `Rail`,
  `ActionBar`, the panels (`StructurePanel` with Pages and Outline,
  `PropertiesPanel`), the breadcrumb's page dropdown (`PagesPanel`),
  primitives and icons, and `shell-alpha.css`.
- `src/lib/iconSet.ts`: the icon set as SVG markup, shared by the shell
  (`icons.tsx`: `Chevron`, `TypeIcon`, `ActionIcon`) and the guest's text
  tools.
- `src/lib/layoutMode.ts`: the switch.
- `src/features/preview/chromeStore.ts` and `src/guest/chrome.ts`: what the
  shell asks of the preview - minimal in-page chrome (no "..." handle, no "+"
  buttons; the selection with its handle tab, see [Editing](Editing.md)), scroll
  space under the bar, the insert line of the Add menu, the device width,
  the element a shell row outlines while hovered (`hoverNode`) - and the
  guest's scroll and pointer reports that fade the bar.
  `src/guest/selectionChrome.ts` draws the selection, its tab and the drag
  chip, `src/guest/textTools.ts` the text tools.
- `src/features/tree/treeStyle.ts`: the alpha tree row (see [Panels](Panels.md#trees-r34-r43)).

Panels come from the panel registry, plugin panels included: main-region
panels are the rail's modes, the others its panel buttons, opening in the
left column (see [Panels](Panels.md)). The Documents panel gives way to the shell's own
Pages panel and the page tree dropdown; the Properties panel shows the
Inspector's own fields (`InspectorPanel layout="panel"`). Header actions
sit in the top bar, node actions in the node pill's element menu.

## The rail

The rail's mode switcher, open, always lists Editor, Media, Workspaces,
Tasks (plugin modes after them), the current one highlighted in its own
slot and the chevron last (R21). The open-tasks dot sits on Tasks while
open, on the current mode's button while closed.

Never render keyboard shortcut hints in the alpha layout.
