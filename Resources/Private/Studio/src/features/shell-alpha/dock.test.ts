/// <reference types="node" />
import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  closeFloating,
  closeLeft,
  NO_PANELS,
  openLeft,
  PROPERTIES,
  restorePanels,
  restorePinned,
  setProperties,
  toggleLeft,
  togglePinned,
} from './dock.ts'

void test('the left column shows one panel, the next replaces it', () => {
  const panels = openLeft(openLeft(NO_PANELS, 'outline'), 'pages')
  assert.deepEqual(panels, { left: 'pages', properties: false })
})

void test('a rail button toggles its panel and keeps Properties', () => {
  let panels = setProperties(openLeft(NO_PANELS, 'outline'), true)
  panels = toggleLeft(panels, 'outline')
  assert.deepEqual(panels, { left: null, properties: true })
  panels = toggleLeft(panels, 'history')
  assert.deepEqual(panels, { left: 'history', properties: true })
  assert.deepEqual(closeLeft(panels, 'outline'), panels)
  assert.deepEqual(closeLeft(panels, 'history'), {
    left: null,
    properties: true,
  })
})

void test('Esc closes floating Properties first, then the left panel', () => {
  const open = { left: 'pages', properties: true }
  const nonePinned = () => false
  const once = closeFloating(open, nonePinned)
  assert.deepEqual(once, { left: 'pages', properties: false })
  assert.deepEqual(closeFloating(once, nonePinned), NO_PANELS)
})

void test('Esc leaves pinned panels open', () => {
  const open = { left: 'pages', properties: true }
  const propertiesPinned = (panel: string) => panel === PROPERTIES
  assert.deepEqual(closeFloating(open, propertiesPinned), {
    left: null,
    properties: true,
  })
  assert.equal(
    closeFloating(open, () => true),
    open,
  )
})

void test('pins toggle per panel', () => {
  const pinned = togglePinned(togglePinned([], 'outline'), PROPERTIES)
  assert.deepEqual(pinned, ['outline', PROPERTIES])
  assert.deepEqual(togglePinned(pinned, 'outline'), [PROPERTIES])
})

void test('stored state is cut down to what is valid', () => {
  const exists = (panel: string) => panel !== 'gone'
  assert.deepEqual(restorePanels({ left: 'gone', properties: true }, exists), {
    left: null,
    properties: true,
  })
  assert.deepEqual(restorePanels({ open: ['outline'], pinned: null }, exists), {
    left: null,
    properties: false,
  })
  assert.deepEqual(restorePanels('outline', exists), NO_PANELS)
  assert.deepEqual(restorePinned(['outline', 3, null]), ['outline'])
  assert.deepEqual(restorePinned(true), [])
})
