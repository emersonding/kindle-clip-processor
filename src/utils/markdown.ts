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
  const textLines = h.text.split('\n').map(line => `> ${line}`).join('\n')
  const kindLabel = h.kind === 'unknown' ? 'clip' : h.kind
  const dateLabel = h.date ? formatDate(h.date) : h.metadata
  return `${textLines}\n> *${kindLabel} · ${dateLabel}*\n`
}

/**
 * Format a book from its title and a list of highlights as markdown.
 * Useful when the highlight list may differ from book.highlights (e.g. filtered).
 */
export function formatBookFromHighlights(title: string, highlights: Highlight[]): string {
  if (highlights.length === 0) return `# ${title}\n`
  return `# ${title}\n\n${highlights.map(formatHighlight).join('\n')}`
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
  return formatBookFromHighlights(book.title, book.highlights)
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
