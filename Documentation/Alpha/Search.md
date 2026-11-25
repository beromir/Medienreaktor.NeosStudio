# Alpha layout: search

Part of the [alpha layout docs](README.md).

## Search (R35)

Search in the action bar (grey while open) and mod+K, from any mode, open
a dialog rather than a popover: searching is a task of its own, and the
same dialog takes the command bar's Actions group later (`SearchDialog`
lists generic groups of rows, so actions join the list and its keyboard
navigation as one more group). 640px wide, 96px from the top, with the
R24 dialog surface and scrim; the input is its title. It stays mounted
while closed, so reopening keeps the query, scope and results - picking
one hit after another stays cheap.

- **Scope:** Whole site, This page (the selected page's own content, not
  that of the pages below it) or Media, plus a type filter over the types
  found (element types first, then media types). Always the active
  workspace and language, unpublished changes included, as the footer
  says.
- **Results:** Pages, Content, Media, up to four each with "Show all n".
  The API ranks nothing, so pages come first, then content in tree order:
  the hits arrive level by level, and where their branches part the
  shell reads the parent's child order to sort them depth first. A row
  shows the match in context (the first text property with the term,
  markup stripped), type and location (and the URL path of a page), and
  its state: "Changed" for a pending change in the workspace, "hidden"
  and quieter text for hidden content. The arrows move the active row
  (grey, one of many), Enter picks; the input keeps the focus.
- **Empty states:** just opened, recent searches (kept in the browser,
  remembered when a result is picked) and the pages with your pending
  changes. Nothing found: the language searched, and the other languages
  the account may edit in that have the term, each with a button that
  switches there and keeps the query.
- **Picking:** a page or element goes through the same reveal as undo:
  the page opens, the element is selected and pulses, and the match is
  marked in it for a moment (`flash-node` with `highlight`, drawn with
  the CSS Custom Highlight API so the page's DOM and its inline editors
  stay untouched). A media hit opens the Media mode with the asset's
  details (`features/media/openAsset.ts`).
- **Backend:** `searchNodeListing` (the reference editor's
  `searchNodes` with the total) for pages and content, `searchAssets`
  for the local media.
