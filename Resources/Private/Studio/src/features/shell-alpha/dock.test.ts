/// <reference types="node" />
import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  clampPagesHeight,
  closeFloating,
  closeLeft,
  DEFAULT_STRUCTURE,
  leftPanelFor,
  MIN_PAGES_HEIGHT,
  NO_PANELS,
  openLeft,
  pageRowsHeight,
  PROPERTIES,
  restoreLeft,
  restorePinned,
  restoreStructure,
  setProperties,
  STRUCTURE,
  toggleLeft,
  togglePinned,
} from './dock.ts'

void test('the left column shows one panel, the next replaces it', () => {
  const panels = openLeft(openLeft(NO_PANELS, 'clipboard'), 'history')
  assert.deepEqual(panels, { left: 'history', properties: false })
})

void test('Pages and Outline open the structure panel', () => {
  assert.equal(leftPanelFor('outline'), STRUCTURE)
  assert.equal(leftPanelFor('shellAlpha:pages'), STRUCTURE)
  assert.equal(leftPanelFor('trash'), 'trash')
  const panels = openLeft(NO_PANELS, 'outline')
  assert.deepEqual(panels, { left: STRUCTURE, properties: false })
  assert.equal(openLeft(panels, STRUCTURE), panels)
  assert.deepEqual(closeLeft(panels, 'outline'), NO_PANELS)
})

void test('a rail button toggles its panel and keeps Properties', () => {
  let panels = setProperties(openLeft(NO_PANELS, STRUCTURE), true)
  panels = toggleLeft(panels, STRUCTURE)
  assert.deepEqual(panels, { left: null, properties: true })
  panels = toggleLeft(panels, 'history')
  assert.deepEqual(panels, { left: 'history', properties: true })
  assert.deepEqual(closeLeft(panels, 'trash'), panels)
  assert.deepEqual(closeLeft(panels, 'history'), {
    left: null,
    properties: true,
  })
})

void test('Esc closes a floating Properties panel and leaves the column', () => {
  const open = { left: STRUCTURE, properties: true }
  const once = closeFloating(open, false)
  assert.deepEqual(once, { left: STRUCTURE, properties: false })
  assert.equal(closeFloating(once, false), once)
})

void test('Esc leaves a pinned Properties panel open', () => {
  const open = { left: 'history', properties: true }
  assert.equal(closeFloating(open, true), open)
})

void test('pins toggle per panel', () => {
  const pinned = togglePinned([], PROPERTIES)
  assert.deepEqual(pinned, [PROPERTIES])
  assert.deepEqual(togglePinned(pinned, PROPERTIES), [])
})

void test('a stored left panel is cut down to what exists', () => {
  const exists = (panel: string) => panel !== 'gone'
  assert.equal(restoreLeft('gone', exists), null)
  assert.equal(restoreLeft('history', exists), 'history')
  assert.equal(
    restoreLeft('outline', () => false),
    STRUCTURE,
  )
  assert.equal(restoreLeft('shellAlpha:pages', exists), STRUCTURE)
  assert.equal(restoreLeft({ left: 'history' }, exists), null)
  assert.equal(restoreLeft(null, exists), null)
  assert.deepEqual(restorePinned(['outline', 3, null]), ['outline'])
  assert.deepEqual(restorePinned(true), [])
})

void test('Pages opens at five rows of 28px with 2px gaps', () => {
  assert.equal(pageRowsHeight(5), 148)
  assert.equal(pageRowsHeight(1), 28)
  assert.equal(DEFAULT_STRUCTURE.pagesHeight, 148)
})

void test('the Pages height keeps one row and leaves the Outline room', () => {
  assert.equal(clampPagesHeight(4, 400), MIN_PAGES_HEIGHT)
  assert.equal(clampPagesHeight(250.4, 400), 250)
  assert.equal(clampPagesHeight(900, 400), 400)
  assert.equal(clampPagesHeight(900, 10), MIN_PAGES_HEIGHT)
})

void test('a stored structure layout is cut down to what is valid', () => {
  assert.deepEqual(restoreStructure(undefined), DEFAULT_STRUCTURE)
  assert.deepEqual(
    restoreStructure({ pagesHeight: 200, pagesFolded: true, outlineFolded: 1 }),
    { pagesHeight: 200, pagesFolded: true, outlineFolded: false },
  )
  assert.deepEqual(restoreStructure({ pagesHeight: 'tall' }), DEFAULT_STRUCTURE)
  assert.equal(restoreStructure({ pagesHeight: 3 }).pagesHeight, 28)
})
