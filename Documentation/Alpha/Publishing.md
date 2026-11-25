# Alpha layout: publishing

Part of the [alpha layout docs](README.md).

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
