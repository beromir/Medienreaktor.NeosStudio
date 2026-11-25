# Alpha layout: editing on the page

Part of the [alpha layout docs](README.md).

## Selecting

A click on an element selects it. A second click on the selected element
deselects it - the page becomes the selection - unless the element has
text of its own to type in (the guest knows from its inline-editable
properties), where the click places the caret as before. Esc deselects
anywhere; with the page selected, Esc closes a floating Properties
panel. Esc always closes an open Add menu first.

The element types listed in the Add menu can be dragged into the page as
well as picked. While one is dragged the menu turns see-through, the
collections that allow the type light up (the guest's `type-drag`), a
line marks the insertion point, and the drop asks the shell to create
the element there (`create-node-request`) - through the creation dialog
when the type has one; the new element is selected.

## Selection and drag (R36, R45)

The selected element gets a 2px blue outline, 4px from the element, with a
tab on its top-left edge (24px, grip and the node type's label). The tab is
the only Studio UI on the page besides the text tools and the only place a
drag starts, so clicks and text selection inside the element stay
untouched. It stays while the editor types, so the element can be dragged
at any time. When there is no room above it (the element touches the top
of the preview), it moves to the outline's bottom edge with rounded bottom
corners - it never covers the text being edited.
Collections get the outline without a tab: they are moved with their
element. Hovering outlines the innermost element under the pointer (1px,
60%), never the selection. Outline and tab are boxes of their own over the
page rather than CSS outlines, which cannot leave one corner square.

Dragging the tab past a few pixels starts a move: the element stays in
place at 35% with a dashed outline, a dark chip (grip, type icon, the
element's label) follows the pointer instead of a copy, and the page scrolls
while the pointer is near its top or above the action bar. The drag runs on
pointer events rather than native drag and drop, so the chip, the scrolling
and Esc stay the guest's.

A drop position is the Add menu's insert line between two siblings of a
collection, with a label: "After **Button** in Teaser area" ("Before …"
for the first position, "Into …" for an empty collection). Only
collections whose allowed types (the server-computed
`data-__neos-studio-allowed-types`, which knows tethered-collection
constraints) include the element's type are targets; elsewhere, inside the
element itself and where the element already is there is no line, and
releasing does nothing. The same line replaces the classic drop indicator
for node types dragged in from the Add menu. Empty collections keep enough
room to drop into although their add button is hidden.

Releasing on a line moves the element (`move-node-request`, the same move
as everywhere: one Undo entry, the preview reloads) and keeps it selected;
Esc cancels the drag and nothing else - the selection stays. The page knows
only type names: the shell sends the content types' labels and icons
(`node-types`), and each wrapped node carries its label
(`data-__neos-studio-label`) for the chip and the collection's name.

Follow-up: an open Outline should mirror the insert line and accept the
drop too (R36).

## Text tools (R45)

The classic toolbars' long rows give way to two small pieces, both 24px
high with 20px controls and the icon set's 14px icons; the classic layout
keeps its toolbars (`guest/toolbar.ts` routes to `guest/textTools.ts` in
the minimal chrome).

- **The strip** - while the caret is in inline-editable text, a dark strip
  continues the handle tab to the right as one piece: Paragraph ▾
  (paragraph, headings, quote, code; its label is the current style),
  Lists ▾ (bulleted, numbered; indent and outdent stay on Tab and
  Shift+Tab) and ⋯ (alignment, table and its operations, horizontal line,
  special characters, soft hyphen, the property's block styles, remove
  formatting, plugin items). 6px top corners on the free side, flat on
  the outline, hairlines between the three, 4px corners on the controls.
  It moves with the tab, also to the outline's bottom edge.
- **The marks bubble** - selected words get Bold, Italic, Link and ⋯
  (underline, strikethrough, sub- and superscript, code, the inline
  styles, clear formatting, plugin items) in a pill above the selection:
  round ends, 1px `#FFFFFF0F` border, shadow, round controls. It never
  covers the handle or sits on the outline: above the selection (above
  the outline where the selection starts the element), below it when there
  is no room above or it would touch the strip.

Only what the property's editor options allow is shown, and a menu with
nothing in it leaves its button out. Active marks and lists are on/off:
the blue tint with a `shell-accent-pale` icon. Buttons act on mousedown,
so the editor keeps its focus and selection.
