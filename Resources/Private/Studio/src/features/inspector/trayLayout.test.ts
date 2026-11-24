/// <reference types="node" />
import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { TraySpan } from './editors/registry.ts'
import { columnsNeeded, trayCells, trayRows } from './trayLayout.ts'

type Field = { name: string; span: TraySpan | 'switch' }
const cellsOf = (fields: Field[]) =>
  trayCells(
    fields,
    (field) => field.span === 'switch',
    (field) => (field.span === 'switch' ? 'row' : field.span),
  )

void test('consecutive switches share a row, the others keep their span', () => {
  const cells = cellsOf([
    { name: 'a', span: 'switch' },
    { name: 'b', span: 'switch' },
    { name: 'title', span: 2 },
    { name: 'c', span: 'switch' },
  ])
  assert.deepEqual(
    cells.map((cell) =>
      cell.kind === 'switches'
        ? cell.items.map((item) => item.name)
        : `${cell.item.name}:${cell.span}`,
    ),
    [['a', 'b'], 'title:2', ['c']],
  )
})

void test('switches and full-row fields need all four columns', () => {
  assert.equal(columnsNeeded(cellsOf([{ name: 'a', span: 1 }])), 1)
  assert.equal(
    columnsNeeded(
      cellsOf([
        { name: 'a', span: 1 },
        { name: 'b', span: 1 },
      ]),
    ),
    2,
  )
  assert.equal(columnsNeeded(cellsOf([{ name: 'a', span: 'switch' }])), 4)
  assert.equal(columnsNeeded(cellsOf([{ name: 'a', span: 'row' }])), 4)
})

void test('two small groups in a row share it', () => {
  const columns: Record<string, number> = { a: 4, b: 2, c: 1, d: 2, e: 2 }
  assert.deepEqual(
    trayRows(['a', 'b', 'c', 'd', 'e'], (group) => columns[group] ?? 0),
    [['a'], ['b', 'c'], ['d', 'e']],
  )
  assert.deepEqual(
    trayRows(['b', 'a', 'c'], (group) => columns[group] ?? 0),
    [['b'], ['a'], ['c']],
  )
})
