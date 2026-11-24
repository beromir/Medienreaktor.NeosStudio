/// <reference types="node" />
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { scopeNoun, scopeReach } from './propertyScope.ts'

const language = {
  id: 'language',
  label: 'Language',
  values: [
    {
      value: 'en_US',
      label: 'English (US)',
      generalization: null,
      specializationDepth: 0,
    },
    {
      value: 'en_GB',
      label: 'English (GB)',
      generalization: 'en_US',
      specializationDepth: 1,
    },
    {
      value: 'de',
      label: 'Deutsch',
      generalization: null,
      specializationDepth: 0,
    },
  ],
}
const point = (value: string) => JSON.stringify({ language: value })
const covered = [point('en_US'), point('en_GB'), point('de')]

void test('a language-only setup speaks of languages', () => {
  assert.equal(scopeNoun([language]), 'languages')
  assert.equal(scopeNoun([{ id: 'country' }]), 'variants')
  assert.equal(scopeNoun([language, { id: 'audience' }]), 'variants')
})

void test('a node aggregate scope reaches every covered point', () => {
  assert.deepEqual(
    scopeReach('nodeAggregate', point('de'), covered, [language]),
    covered,
  )
})

void test('a specializations scope reaches the edited point and its specializations', () => {
  assert.deepEqual(
    scopeReach('specializations', point('en_US'), covered, [language]),
    [point('en_US'), point('en_GB')],
  )
  assert.deepEqual(
    scopeReach('specializations', point('de'), covered, [language]),
    [point('de')],
  )
})
