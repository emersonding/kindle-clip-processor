import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { formatDate, formatHighlight, formatBook, formatAll, slugify } from './markdown.ts'
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
    }
    const result = formatHighlight(h)
    assert.equal(result, '> 生命的本质就是孤独。\n> *2016-03-01 14:30*\n')
  })

  test('falls back to metadata string when date is null', () => {
    const h: Highlight = {
      title: 'Some Book',
      metadata: '- raw metadata line',
      text: 'Some highlight text.',
      date: null,
    }
    const result = formatHighlight(h)
    assert.equal(result, '> Some highlight text.\n> *- raw metadata line*\n')
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
        },
        {
          title: 'My Book',
          metadata: 'meta2',
          text: 'Second highlight.',
          date: new Date(2020, 0, 2, 10, 30),
        },
      ],
    }
    const result = formatBook(book)
    const expected =
      '# My Book\n' +
      '\n' +
      '> First highlight.\n> *2020-01-01 09:00*\n' +
      '\n' +
      '> Second highlight.\n> *2020-01-02 10:30*\n'
    assert.equal(result, expected)
  })
})

describe('formatAll', () => {
  test('joins two books with \\n\\n---\\n\\n', () => {
    const books: Book[] = [
      {
        title: 'Book One',
        highlights: [
          {
            title: 'Book One',
            metadata: 'meta',
            text: 'Highlight one.',
            date: new Date(2021, 0, 1, 8, 0),
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
