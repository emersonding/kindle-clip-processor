import type { Book, Highlight } from '../parser/index.ts'

/**
 * Format date as YYYY-MM-DD HH:MM string. Returns '' if date is null.
 */
export function formatDate(date: Date | null): string {
  if (!date) return ''
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`
}

/**
 * Format a single highlight as a markdown blockquote with date.
 * Output:
 * > highlight text
 * > *YYYY-MM-DD HH:MM*
 */
export function formatHighlight(h: Highlight): string {
  const dateStr = h.date ? formatDate(h.date) : h.metadata
  return `> ${h.text}\n> *${dateStr}*\n`
}

/**
 * Format a single book as markdown.
 * Output:
 * # Book Title
 *
 * > highlight 1 text
 * > *date*
 *
 * > highlight 2 text
 * > *date*
 */
export function formatBook(book: Book): string {
  const lines: string[] = [`# ${book.title}\n`]
  for (const h of book.highlights) {
    lines.push(formatHighlight(h))
  }
  return lines.join('\n')
}

/**
 * Format all books as markdown, separated by ---
 */
export function formatAll(books: Book[]): string {
  return books.map(formatBook).join('\n---\n\n')
}

/**
 * Slugify a book title for use as a filename.
 * Falls back to 'kindle-highlights' if result would be empty (e.g. all-Chinese title).
 */
export function slugify(title: string): string {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return slug || 'kindle-highlights'
}
