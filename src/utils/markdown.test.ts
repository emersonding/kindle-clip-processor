import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { formatDate, formatHighlight, formatBook, formatBookFromHighlights, formatAll, slugify } from './markdown.ts'
import type { Highlight, Book } from '../parser/index.ts'

describe('formatDate', () => {
  test('formats a valid date as YYYY-MM-DD HH:MM', () => {
    const result = formatDate(new Date(2015, 8, 24, 5, 8))
    assert.equal(result, '2015-09-24 05:08')
  })

  test('returns empty string for null', () => {
    const result = formatDate(null)
    assert.equal(result, '')
  })
})

describe('formatHighlight', () => {
  test('produces correct blockquote format with date', () => {
    const h: Highlight = {
      title: '挪威的森林',
      metadata: '- 您在第45页的标注 | 添加于 2016年3月1日星期二 下午2:30:00',
      text: '生命的本质就是孤独。',
      date: new Date(2016, 2, 1, 14, 30),
      kind: 'highlight',
    }
    const result = formatHighlight(h)
    assert.equal(result, '> 生命的本质就是孤独。\n> *highlight · 2016-03-01 14:30*\n')
  })

  test('falls back to metadata string when date is null', () => {
    const h: Highlight = {
      title: 'Some Book',
      metadata: '- raw metadata line',
      text: 'Some highlight text.',
      date: null,
      kind: 'note',
    }
    const result = formatHighlight(h)
    assert.equal(result, '> Some highlight text.\n> *note · - raw metadata line*\n')
  })

  test('prefixes every line of multiline text with >', () => {
    const h: Highlight = {
      title: 'My Book',
      metadata: 'meta',
      text: 'First line.\nSecond line.',
      date: new Date(2020, 0, 1, 9, 0),
      kind: 'highlight',
    }
    const result = formatHighlight(h)
    assert.equal(result, '> First line.\n> Second line.\n> *highlight · 2020-01-01 09:00*\n')
  })
})

describe('formatBook', () => {
  test('produces # Title followed by blockquotes for each highlight', () => {
    const book: Book = {
      title: 'My Book',
      highlights: [
        {
          title: 'My Book',
          metadata: 'meta1',
          text: 'First highlight.',
          date: new Date(2020, 0, 1, 9, 0),
          kind: 'highlight',
        },
        {
          title: 'My Book',
          metadata: 'meta2',
          text: 'Second highlight.',
          date: new Date(2020, 0, 2, 10, 30),
          kind: 'note',
        },
      ],
    }
    const result = formatBook(book)
    const expected =
      '# My Book\n' +
      '\n' +
      '> First highlight.\n> *highlight · 2020-01-01 09:00*\n' +
      '\n' +
      '> Second highlight.\n> *note · 2020-01-02 10:30*\n'
    assert.equal(result, expected)
  })

  test('zero highlights produces only the title header', () => {
    const book: Book = { title: 'Empty Book', highlights: [] }
    assert.equal(formatBook(book), '# Empty Book\n')
  })
})

describe('formatBookFromHighlights', () => {
  test('zero highlights produces only the title header', () => {
    assert.equal(formatBookFromHighlights('Empty Book', []), '# Empty Book\n')
  })

  test('produces correct markdown for given highlights', () => {
    const highlights: Highlight[] = [
      {
        title: 'My Book',
        metadata: 'meta1',
        text: 'First highlight.',
        date: new Date(2020, 0, 1, 9, 0),
        kind: 'highlight',
      },
    ]
    const result = formatBookFromHighlights('My Book', highlights)
    assert.equal(result, '# My Book\n\n> First highlight.\n> *highlight · 2020-01-01 09:00*\n')
  })
})

describe('formatAll', () => {
  test('empty array produces empty string', () => {
    assert.equal(formatAll([]), '')
  })

  test('joins two books with \\n---\\n\\n separator (inline literal)', () => {
    const books: Book[] = [
      {
        title: 'Book One',
        highlights: [
          {
            title: 'Book One',
            metadata: 'meta',
            text: 'Highlight one.',
            date: new Date(2021, 0, 1, 8, 0),
            kind: 'highlight',
          },
        ],
      },
      {
        title: 'Book Two',
        highlights: [
          {
            title: 'Book Two',
            metadata: 'meta',
            text: 'Highlight two.',
            date: new Date(2021, 5, 15, 12, 0),
            kind: 'note',
          },
        ],
      },
    ]
    const result = formatAll(books)
    const expected =
      '# Book One\n\n> Highlight one.\n> *highlight · 2021-01-01 08:00*\n' +
      '\n---\n\n' +
      '# Book Two\n\n> Highlight two.\n> *note · 2021-06-15 12:00*\n'
    assert.equal(result, expected)
  })

  test('joins two books with \\n---\\n\\n (delegating to formatBook)', () => {
    const books: Book[] = [
      {
        title: 'Book One',
        highlights: [
          {
            title: 'Book One',
            metadata: 'meta',
            text: 'Highlight one.',
            date: new Date(2021, 0, 1, 8, 0),
            kind: 'highlight',
          },
        ],
      },
      {
        title: 'Book Two',
        highlights: [
          {
            title: 'Book Two',
            metadata: 'meta',
            text: 'Highlight two.',
            date: new Date(2021, 5, 15, 12, 0),
            kind: 'highlight',
          },
        ],
      },
    ]
    const result = formatAll(books)
    const bookOne = formatBook(books[0])
    const bookTwo = formatBook(books[1])
    assert.equal(result, `${bookOne}\n---\n\n${bookTwo}`)
  })
})

describe('slugify', () => {
  test('all-non-ASCII title falls back to kindle-highlights', () => {
    const result = slugify('舞!舞!舞!')
    assert.equal(result, 'kindle-highlights')
  })

  test('ASCII title is lowercased and hyphenated', () => {
    const result = slugify('My Book Title')
    assert.equal(result, 'my-book-title')
  })
})
