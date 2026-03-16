import { Book } from '../parser'

interface BookDetailProps {
  book: Book | null
  highlightCount: number
  onCopy: () => void
  onSave: () => void
}

export function BookDetail({ book, highlightCount, onCopy, onSave }: BookDetailProps) {
  if (!book) {
    return (
      <div className="book-detail book-detail--empty">
        <p className="book-detail-placeholder">Select a book to view highlights</p>
      </div>
    )
  }

  return (
    <div className="book-detail book-detail-header">
      <div className="book-detail-info">
        <h2 className="book-detail-title">{book.title}</h2>
        <p className="book-detail-subtitle">
          {highlightCount} {highlightCount === 1 ? 'highlight' : 'highlights'}
        </p>
      </div>
      <div className="book-detail-actions">
        <button className="btn btn-secondary" onClick={onCopy} title="Copy as markdown">
          📋 Copy
        </button>
        <button className="btn btn-secondary" onClick={onSave} title="Save as .md">
          ⬇ Save .md
        </button>
      </div>
    </div>
  )
}
