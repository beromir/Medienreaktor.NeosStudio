/// <reference types="node" />
import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  closeDocked,
  type Dock,
  EMPTY_DOCK,
  keepOpen,
  openDocked,
  restoreDock,
  toggleDocked,
  togglePin,
} from './dock.ts'

void test('without a pin, opening a panel replaces the open one', () => {
  const dock = openDocked(openDocked(EMPTY_DOCK, 'outline'), 'history')
  assert.deepEqual(dock, { open: ['history'], pinned: null })
})

void test('a pinned panel stays and the next opens beside it', () => {
  let dock = togglePin(openDocked(EMPTY_DOCK, 'properties'), 'properties')
  dock = openDocked(dock, 'outline')
  assert.deepEqual(dock, {
    open: ['properties', 'outline'],
    pinned: 'properties',
  })
  dock = openDocked(dock, 'history')
  assert.deepEqual(dock, {
    open: ['properties', 'history'],
    pinned: 'properties',
  })
})

void test('moving the pin keeps the panels in place', () => {
  let dock: Dock = { open: ['properties', 'outline'], pinned: 'properties' }
  dock = togglePin(dock, 'outline')
  assert.deepEqual(dock, { open: ['properties', 'outline'], pinned: 'outline' })
  dock = openDocked(dock, 'history')
  assert.deepEqual(dock, { open: ['history', 'outline'], pinned: 'outline' })
})

void test('closing the pinned panel drops the pin', () => {
  const dock = closeDocked(
    { open: ['properties', 'outline'], pinned: 'properties' },
    'properties',
  )
  assert.deepEqual(dock, { open: ['outline'], pinned: null })
  assert.deepEqual(toggleDocked(dock, 'outline'), EMPTY_DOCK)
})

void test('keep open docks the panel pinned, next to an open one', () => {
  assert.deepEqual(
    keepOpen({ open: ['outline'], pinned: null }, 'properties'),
    {
      open: ['properties', 'outline'],
      pinned: 'properties',
    },
  )
  assert.deepEqual(
    keepOpen({ open: ['outline', 'history'], pinned: 'history' }, 'properties'),
    { open: ['properties', 'history'], pinned: 'properties' },
  )
})

void test('a stored dock is cut down to valid panels', () => {
  const exists = (panel: string) => panel !== 'gone'
  assert.deepEqual(restoreDock({ open: ['a', 'b'], pinned: null }, exists), {
    open: ['a'],
    pinned: null,
  })
  assert.deepEqual(
    restoreDock({ open: ['gone', 'a'], pinned: 'gone' }, exists),
    {
      open: ['a'],
      pinned: null,
    },
  )
  assert.deepEqual(restoreDock('outline', exists), EMPTY_DOCK)
})
