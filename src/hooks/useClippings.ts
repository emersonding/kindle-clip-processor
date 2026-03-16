import { useState, useEffect, useCallback } from 'react'
import { Book, Highlight, parseClippings } from '../parser'

export interface ClippingsState {
  books: Book[]
  selectedBook: Book | null
  query: string
  dateFrom: string
  dateTo: string
  lastImported: string
  lastImportedAt: string
  kindleConnected: boolean
  kindlePath: string
}

function highlightMatchesFilters(
  h: Highlight,
  query: string,
  dateFrom: string,
  dateTo: string
): boolean {
  if (query && !h.text.toLowerCase().includes(query.toLowerCase())) {
    return false
  }
  if (dateFrom && h.date) {
    const from = new Date(dateFrom + 'T00:00:00')
    if (h.date < from) return false
  }
  if (dateTo && h.date) {
    const to = new Date(dateTo + 'T23:59:59')
    if (h.date > to) return false
  }
  return true
}

export function useClippings() {
  const [state, setState] = useState<ClippingsState>({
    books: [],
    selectedBook: null,
    query: '',
    dateFrom: '',
    dateTo: '',
    lastImported: '',
    lastImportedAt: '',
    kindleConnected: false,
    kindlePath: '',
  })

  useEffect(() => {
    if (!window.electronAPI) return
    const cleanup = window.electronAPI.onKindleConnected((filePath: string) => {
      setState(s => ({ ...s, kindleConnected: true, kindlePath: filePath }))
    })
    return cleanup
  }, [])

  const loadFromText = useCallback((content: string, filename: string) => {
    const books = parseClippings(content)
    setState(s => ({
      ...s,
      books,
      selectedBook: null,
      lastImported: filename,
      lastImportedAt: new Date().toISOString().slice(0, 10),
    }))
  }, [])

  const selectBook = useCallback((book: Book | null) => {
    setState(s => ({ ...s, selectedBook: book }))
  }, [])

  const setQuery = useCallback((q: string) => {
    setState(s => ({ ...s, query: q }))
  }, [])

  const setDateFrom = useCallback((d: string) => {
    setState(s => ({ ...s, dateFrom: d }))
  }, [])

  const setDateTo = useCallback((d: string) => {
    setState(s => ({ ...s, dateTo: d }))
  }, [])

  const { books, selectedBook, query, dateFrom, dateTo } = state

  const filteredBooks: Book[] = (query || dateFrom || dateTo)
    ? books
        .map(book => ({
          ...book,
          highlights: book.highlights.filter(h =>
            highlightMatchesFilters(h, query, dateFrom, dateTo)
          ),
        }))
        .filter(book => book.highlights.length > 0)
    : books

  const filteredHighlights: Highlight[] = selectedBook
    ? (query || dateFrom || dateTo)
      ? selectedBook.highlights.filter(h =>
          highlightMatchesFilters(h, query, dateFrom, dateTo)
        )
      : selectedBook.highlights
    : []

  return {
    ...state,
    filteredBooks,
    filteredHighlights,
    loadFromText,
    selectBook,
    setQuery,
    setDateFrom,
    setDateTo,
  }
}
