/// <reference types="node" />
import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  documentPath,
  highlightParts,
  propertySnippet,
  rememberSearch,
  snippetAround,
  stripMarkup,
  branchingParents,
  treeOrder,
} from './searchText.ts'

const hit = (id: string, ...ancestors: string[]) => ({
  nodeAggregateId: id,
  ancestors: ancestors.map((nodeAggregateId) => ({ nodeAggregateId })),
})

void test('markup is stripped, entities decoded, whitespace collapsed', () => {
  assert.equal(
    stripMarkup(
      '<p>Our <strong>summer</strong>&nbsp;workshop</p><p>is&#32;back &amp; more</p>',
    ),
    'Our summer workshop is back & more',
  )
})

void test('the whole term is highlighted case-insensitively', () => {
  assert.deepEqual(highlightParts('Summer offers, summer fun', 'summer'), [
    { text: 'Summer', match: true },
    { text: ' offers, ', match: false },
    { text: 'summer', match: true },
    { text: ' fun', match: false },
  ])
})

void test('without the whole term, its words are highlighted', () => {
  assert.deepEqual(highlightParts('summer at the lake', 'lake summer'), [
    { text: 'summer', match: true },
    { text: ' at the ', match: false },
    { text: 'lake', match: true },
  ])
})

void test('a short text is its own snippet', () => {
  assert.equal(
    snippetAround('Book your summer stay', 'summer'),
    'Book your summer stay',
  )
})

void test('a long text is cut around the match at word boundaries', () => {
  const text =
    'Every year we meet for three days at the lake, every summer since 2019, open to all members and their families who want to come along.'
  const snippet = snippetAround(text, 'summer', 24)
  assert.ok(snippet?.startsWith('…'))
  assert.ok(snippet?.endsWith('…'))
  assert.ok(snippet?.includes('every summer since'))
  assert.equal(snippetAround(text, 'winter'), null)
})

void test('the snippet comes from the first text property with the term', () => {
  assert.equal(
    propertySnippet(
      {
        _hidden: 'summer',
        uriPathSegment: 'summer',
        title: 'Workshop',
        text: '<p>Our <em>summer</em> workshop</p>',
      },
      'summer',
    ),
    'Our summer workshop',
  )
  assert.equal(propertySnippet({ title: 'Workshop' }, 'summer'), null)
})

void test('hits are put in depth-first tree order', () => {
  // As the search lists them: level by level.
  const hits = [
    hit('a', 'site'),
    hit('b', 'site'),
    hit('a1', 'a', 'site'),
    hit('b1', 'b', 'site'),
    hit('a2', 'a', 'site'),
  ]
  assert.deepEqual(
    treeOrder(hits).map((entry) => entry.nodeAggregateId),
    ['a', 'a1', 'a2', 'b', 'b1'],
  )
})

void test('known child positions order cousins', () => {
  // The footer text is listed first: position 0 in its own parent.
  const hits = [
    hit('text', 'footer', 'home'),
    hit('headline', 'teaser', 'home'),
  ]
  assert.deepEqual(branchingParents(hits), ['home'])
  const positions = new Map([
    ['teaser', 0],
    ['main', 1],
    ['footer', 2],
  ])
  assert.deepEqual(
    treeOrder(hits, positions).map((entry) => entry.nodeAggregateId),
    ['headline', 'text'],
  )
})

void test('a document path joins the URL path segments', () => {
  assert.equal(
    documentPath([
      { properties: { uriPathSegment: 'blog' } },
      { properties: { uriPathSegment: 'summer-offers-2026' } },
    ]),
    '/blog/summer-offers-2026',
  )
  assert.equal(documentPath([{ properties: {} }]), null)
})

void test('a recent search moves to the front once', () => {
  assert.deepEqual(rememberSearch(['a', 'Summer', 'b'], 'summer', 3), [
    'summer',
    'a',
    'b',
  ])
})
