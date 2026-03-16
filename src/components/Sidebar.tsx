import { Book } from '../parser'

interface SidebarProps {
  books: Book[]
  selectedBook: Book | null
  onSelectBook: (book: Book) => void
  onSaveBook: (book: Book) => void
  totalHighlightCount: number
}

export function Sidebar({
  books,
  selectedBook,
  onSelectBook,
  onSaveBook,
  totalHighlightCount,
}: SidebarProps) {
  const bookCount = books.length

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <span className="sidebar-count">
          {bookCount} {bookCount === 1 ? 'Book' : 'Books'}
        </span>
        <span className="sidebar-count-sep"> · </span>
        <span className="sidebar-count">{totalHighlightCount} highlights</span>
      </div>
      <div className="sidebar-list">
        {books.map(book => {
          const isSelected = selectedBook?.title === book.title
          return (
            <div
              key={book.title}
              className={`sidebar-item${isSelected ? ' sidebar-item--selected' : ''}`}
              onClick={() => onSelectBook(book)}
            >
              <span className="sidebar-book-icon">📖</span>
              <span className="sidebar-book-title">{book.title}</span>
              <span className="sidebar-book-count">{book.highlights.length}</span>
              <button
                className="btn-icon sidebar-save-btn"
                title="Save as .md"
                aria-label="Save as markdown"
                onClick={e => {
                  e.stopPropagation()
                  onSaveBook(book)
                }}
              >
                ⬇
              </button>
            </div>
          )
        })}
        {books.length === 0 && (
          <div className="sidebar-empty">No books found</div>
        )}
      </div>
    </div>
  )
}
