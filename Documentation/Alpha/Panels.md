# Alpha layout: panels

Part of the [alpha layout docs](README.md).

## Docking (R44)

Left is where you go, right is what you selected. The left column holds
Pages and Outline (one panel), Clipboard, Trash, then plugin panels and
History - one at a time, docked between the rail and the preview: 280px
for every panel, full height, 8px from both, the preview card's surface
(16px corners, hairline border, no shadow). The preview narrows; switching
panels swaps the content, never the width, so the site only reflows when
the column opens or closes. There is no pin on the left: the panel's close
or its rail button folds the column. Which panel is open is the
`studio.alpha.leftPanel` user preference, so the column stays as the
editor left it across sessions and browsers.

The right side holds the Properties panel and nothing else. It floats over
the preview's right edge, 14px inside the card, with a shadow, and the
site keeps its width; its pin docks it beside the preview, which narrows
further. The pin is the `studio.alpha.pinnedPanels` user preference;
whether Properties is open is kept per browser. A floating Properties
panel stays open until it is closed - its ✕, Settings or Esc; a click in
the page never closes it. The action bar centres in the part of the
preview nothing covers: between the docked column and a floating
Properties panel. The rules live in `shell-alpha/dock.ts`.

## The Properties panel

The Properties panel opens only on purpose: from the node pill's Settings
button, which shows grey while the panel is open. Selecting never opens
it, so the preview does not jump between widths. While open it follows
the selection and shows the page when the page is selected - its title,
URL path and menu visibility first. Its heading - the type icon, the
node's name and a chevron - opens the path menu (`PathMenu`): the page,
the parents, the node itself (checked) and its children; picking one
selects it. Pin and close follow as 14px icons; the fields scroll. An
element with nothing to set
once the element menu's properties are left out (an untouched content
collection) has no Settings button.

The settings tray of R19-R29 is gone: on centred sites it always covered
what was being edited.

The Properties panel shows a content element's content settings in the
node type's inspector tabs (`ui.inspector.tabs`, icons from the tab
config, pencil / cog / sliders when none is set - those three drawn from
the icon set), at the top as 30x28 tabs with 14px icons at fixed
positions, the active one on a `shell-ground` pill, the label as tooltip;
a single tab has no tab row. Every group of the active tab starts open and
collapses with its 10px chevron; only groups configured `collapsed: true`
start closed. The node pill names the node.

## Pages and Outline (R41-R44)

The rail's first button (a tree) opens one panel with two sections, Pages
on top and the Outline below. Each has a 44px header: a 10px chevron that
folds the section, the 13px title and 28px icon actions - Pages: filter
and + (a new page inside the current one); Outline: Collapse all and
filter. The panel's close follows after a hairline in the first header.

Pages opens at five rows and scrolls inside, the current page scrolled
into view; the handle between the sections (a 28x3 grip on a hairline)
resizes it, and the Outline always gets the rest. Folded, the Pages header
shows the current page next to its title and only the close; a folded
Outline gives Pages the whole height. The height and both folds are the
`studio.alpha.structure` user preference.

The filter takes the header in place: the search icon (or typing while
the tree has focus) turns the section's header into a 30px field with the
match count and ✕, and the close steps aside meanwhile. Esc closes the
filter first, then the panel. Results keep their parents, muted, for
context, the match marked in `shell-accent-pale`; picking one opens the
page or selects the element, and the filter stays until it is closed.
Pages searches the site's titles on the server (as the Documents panel
does); the Outline reads the page's content once and filters the labels.
Both sort the results in tree order (`features/tree/filterRows.ts`).

The Outline reveals the selection - opens its parents, scrolls it into
view - and never folds anything by itself; Collapse all folds every row.
Opening a page keeps the panel as it is. The breadcrumb's page dropdown
stays for quick jumps, Search for everything else.

## Trees (R34, R43)

The Outline and Pages draw one row: 28px, 8px corners, a fixed 10px
chevron slot and a 12px type icon slot, so labels line up at every level,
16px indent per level, labels in `shell-text`. The icon set draws pages
(a house for the home page), areas, columns, headlines and text; other
types keep their own icon at the same size. The current page gets the grey
fill (`shell-raised`, semibold), the selected element the blue tint with a
`shell-accent-pale` icon - the column never shows two blues. Hover is a
`shell-ground` fill, and the trailing note ("n inside" on closed rows once
their children are loaded) gives way to two 22px actions. Pages: + (a new
page inside) and ⋯ (the page menu). Outline: + and ⋯ (the element menu,
with Hide / Unhide first). The Outline's + adds after an element, and
inside, at the end, on anything that holds elements (areas, columns); its
tooltip says which ("Add after" / "Add inside"), and it opens the action
bar's Add menu with that position set (`shell-alpha/addRequest.ts`).
Hidden rows stay faded with a dashed icon and "hidden". Hovering an
Outline row outlines its element in the preview. The Outline leaves out
its root row.

`TreeList` draws these rows when the alpha shell provides the tree style
(`TreeStyleContext`) and the tree passes `alphaRow`; other trees (the
media folders) keep their classic rows inside the alpha layout too.
