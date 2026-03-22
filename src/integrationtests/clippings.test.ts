/**
 * Integration tests: load real resource files → parse → filter → export.
 *
 * These tests exercise parseClippings + the filter logic (mirrored from
 * useClippings) + formatAll together against the actual sample files in
 * resources/. They act as a regression harness for real-world file content.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseClippings, Highlight } from '../parser/index.ts';
import { formatAll, formatBookFromHighlights } from '../utils/markdown.ts';

// Resources are at project root /resources
const RESOURCES = join(__dirname, '../../resources');

function loadSample(filename: string): string {
  return readFileSync(join(RESOURCES, filename), 'utf-8');
}

// Mirror of highlightMatchesFilters from useClippings.ts
function matchesFilters(h: Highlight, query: string, dateFrom: string, dateTo: string): boolean {
  if (query && !h.text.toLowerCase().includes(query.toLowerCase())) return false;
  if (dateFrom && h.date) {
    if (h.date < new Date(dateFrom + 'T00:00:00')) return false;
  }
  if (dateTo && h.date) {
    if (h.date > new Date(dateTo + 'T23:59:59')) return false;
  }
  return true;
}

// ---- English sample -------------------------------------------------------

describe('English sample (sample-english.txt)', () => {
  const content = loadSample('sample-english.txt');
  const books = parseClippings(content);

  test('parses 4 books', () => {
    assert.equal(books.length, 4);
  });

  test('book titles are correct', () => {
    const titles = books.map(b => b.title);
    assert.ok(titles.some(t => t.includes('Thinking, Fast and Slow')));
    assert.ok(titles.some(t => t.includes('Pragmatic Programmer')));
    assert.ok(titles.some(t => t.includes('Sapiens')));
    assert.ok(titles.some(t => t.includes('Atomic Habits')));
  });

  test('contains 20 parsed clips with mixed highlight and note kinds', () => {
    const clips = books.flatMap(book => book.highlights);
    assert.equal(clips.length, 20);
    assert.equal(clips.filter(clip => clip.kind === 'highlight').length, 12);
    assert.equal(clips.filter(clip => clip.kind === 'note').length, 8);
  });

  test('Thinking, Fast and Slow has 5 clips', () => {
    const book = books.find(b => b.title.includes('Thinking, Fast and Slow'))!;
    assert.equal(book.highlights.length, 5);
  });

  test('The Pragmatic Programmer has 5 entries', () => {
    const book = books.find(b => b.title.includes('Pragmatic Programmer'))!;
    assert.equal(book.highlights.length, 5);
  });

  test('Sapiens has 5 clips', () => {
    const book = books.find(b => b.title.includes('Sapiens'))!;
    assert.equal(book.highlights.length, 5);
  });

  test('Atomic Habits has 5 clips using US date format', () => {
    const book = books.find(b => b.title.includes('Atomic Habits'))!;
    assert.equal(book.highlights.length, 5);
  });

  test('all highlights have non-null dates (English date parsing works)', () => {
    for (const book of books) {
      for (const h of book.highlights) {
        assert.notEqual(h.date, null, `Expected non-null date for: "${h.metadata}"`);
      }
    }
  });

  test('dates are in expected year 2025', () => {
    for (const book of books) {
      for (const h of book.highlights) {
        assert.equal(h.date!.getFullYear(), 2025, `Expected 2025 for: "${h.metadata}"`);
      }
    }
  });

  // ---- Date filtering ----

  test('date filter: Feb 2025 returns only Sapiens clips', () => {
    const filtered = books
      .map(b => ({ ...b, highlights: b.highlights.filter(h => matchesFilters(h, '', '2025-02-01', '2025-02-28')) }))
      .filter(b => b.highlights.length > 0);

    assert.equal(filtered.length, 1);
    assert.ok(filtered[0].title.includes('Sapiens'));
    assert.equal(filtered[0].highlights.length, 5);
  });

  test('date filter: Jan 2025 excludes Sapiens', () => {
    const filtered = books
      .map(b => ({ ...b, highlights: b.highlights.filter(h => matchesFilters(h, '', '2025-01-01', '2025-01-31')) }))
      .filter(b => b.highlights.length > 0);

    assert.ok(filtered.every(b => !b.title.includes('Sapiens')));
  });

  test('date filter: narrow range returns subset', () => {
    // Pragmatic Programmer clips span Jan 15-16; Thinking is Jan 5, Sapiens is Feb, Atomic Habits is Mar.
    const filtered = books
      .map(b => ({ ...b, highlights: b.highlights.filter(h => matchesFilters(h, '', '2025-01-15', '2025-01-16')) }))
      .filter(b => b.highlights.length > 0);

    assert.equal(filtered.length, 1);
    assert.ok(filtered[0].title.includes('Pragmatic Programmer'));
    assert.equal(filtered[0].highlights.length, 5);
  });

  // ---- Keyword filtering ----

  test('keyword filter: "windows" returns only Pragmatic Programmer', () => {
    const filtered = books
      .map(b => ({ ...b, highlights: b.highlights.filter(h => matchesFilters(h, 'windows', '', '')) }))
      .filter(b => b.highlights.length > 0);

    assert.equal(filtered.length, 1);
    assert.ok(filtered[0].title.includes('Pragmatic Programmer'));
  });

  test('keyword filter is case-insensitive', () => {
    const lower = books.flatMap(b => b.highlights.filter(h => matchesFilters(h, 'confidence', '', '')));
    const upper = books.flatMap(b => b.highlights.filter(h => matchesFilters(h, 'CONFIDENCE', '', '')));
    assert.deepEqual(lower.length, upper.length);
    assert.ok(lower.length > 0);
  });

  test('keyword filter: unknown term returns nothing', () => {
    const filtered = books
      .map(b => ({ ...b, highlights: b.highlights.filter(h => matchesFilters(h, 'xyzzy_no_match', '', '')) }))
      .filter(b => b.highlights.length > 0);

    assert.equal(filtered.length, 0);
  });

  // ---- Markdown export ----

  test('formatAll produces non-empty markdown', () => {
    const md = formatAll(books);
    assert.ok(md.length > 0);
  });

  test('formatAll contains all book titles', () => {
    const md = formatAll(books);
    assert.ok(md.includes('Thinking, Fast and Slow'));
    assert.ok(md.includes('Pragmatic Programmer'));
    assert.ok(md.includes('Sapiens'));
    assert.ok(md.includes('Atomic Habits'));
  });

  test('formatAll contains blockquote-formatted highlights', () => {
    const md = formatAll(books);
    assert.ok(md.includes('> '));
  });

  test('formatBookFromHighlights produces correct markdown for a single book', () => {
    const book = books.find(b => b.title.includes('Sapiens'))!;
    const md = formatBookFromHighlights(book.title, book.highlights);
    assert.ok(md.startsWith('# Sapiens'));
    assert.equal((md.match(/^> /m) !== null), true);
  });
});

// ---- Chinese sample -------------------------------------------------------

describe('Chinese sample (sample-chinese.txt)', () => {
  const content = loadSample('sample-chinese.txt');
  const books = parseClippings(content);

  test('parses 2 books', () => {
    assert.equal(books.length, 2);
  });

  test('contains 20 parsed clips with mixed highlight and note kinds', () => {
    const clips = books.flatMap(book => book.highlights);
    assert.equal(clips.length, 20);
    assert.equal(clips.filter(clip => clip.kind === 'highlight').length, 11);
    assert.equal(clips.filter(clip => clip.kind === 'note').length, 9);
  });

  test('email is stripped from titles', () => {
    for (const book of books) {
      assert.ok(!book.title.includes('@'), `Title should not contain email: "${book.title}"`);
    }
  });

  test('all highlights have non-null dates (Chinese date parsing works)', () => {
    for (const book of books) {
      for (const h of book.highlights) {
        assert.notEqual(h.date, null, `Expected non-null date for: "${h.metadata}"`);
      }
    }
  });

  test('dates are in year 2015', () => {
    for (const book of books) {
      for (const h of book.highlights) {
        assert.equal(h.date!.getFullYear(), 2015, `Expected 2015 for: "${h.metadata}"`);
      }
    }
  });

  test('date filter: October 2015 returns only the second book (雨天炎天)', () => {
    const filtered = books
      .map(b => ({ ...b, highlights: b.highlights.filter(h => matchesFilters(h, '', '2015-10-01', '2015-10-31')) }))
      .filter(b => b.highlights.length > 0);

    assert.equal(filtered.length, 1);
    assert.ok(filtered[0].title.includes('雨天炎天'));
  });

  test('formatAll produces non-empty markdown for Chinese content', () => {
    const md = formatAll(books);
    assert.ok(md.length > 0);
    assert.ok(md.includes('> '));
  });
});
