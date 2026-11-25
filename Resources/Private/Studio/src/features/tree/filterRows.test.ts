/// <reference types="node" />
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { filterRows, labelMatches } from './filterRows.ts'

const node = (id: string) => ({ nodeAggregateId: id, node: id })
const hit = (id: string, ...ancestors: string[]) => ({
  ...node(id),
  ancestors: ancestors.map(node),
})

void test('matches keep their parents, each listed once', () => {
  const rows = filterRows([
    hit('text', 'main', 'page', 'site'),
    hit('headline', 'main', 'page', 'site'),
  ])
  assert.deepEqual(
    rows.map((row) => [row.nodeAggregateId, row.depth, row.match, row.parent]),
    [
      ['site', 0, false, true],
      ['page', 1, false, true],
      ['main', 2, false, true],
      ['text', 3, true, false],
      ['headline', 3, true, false],
    ],
  )
})

void test('rows start below the root and skip hits outside it', () => {
  const rows = filterRows(
    [
      hit('text', 'main', 'page', 'site'),
      hit('other', 'subMain', 'subpage', 'page', 'site'),
      hit('elsewhere', 'main', 'sibling', 'site'),
    ],
    'page',
  )
  assert.deepEqual(
    rows.map((row) => [row.nodeAggregateId, row.depth]),
    [
      ['main', 0],
      ['text', 1],
      ['subpage', 0],
      ['subMain', 1],
      ['other', 2],
    ],
  )
})

void test('a match that holds another match is both', () => {
  const rows = filterRows([
    hit('columns', 'main', 'site'),
    hit('text', 'column0', 'columns', 'main', 'site'),
  ])
  const columns = rows.find((row) => row.nodeAggregateId === 'columns')
  assert.equal(columns?.match, true)
  assert.equal(columns?.parent, true)
  assert.equal(rows.find((row) => row.nodeAggregateId === 'main')?.match, false)
})

void test('labels match case-insensitively, never on an empty term', () => {
  assert.equal(labelMatches('Content dimensions', 'con'), true)
  assert.equal(labelMatches('Content dimensions', 'DIM'), true)
  assert.equal(labelMatches('Content dimensions', 'x'), false)
  assert.equal(labelMatches('Content', '  '), false)
})
