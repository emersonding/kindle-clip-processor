import { useRef } from 'react'
import './App.css'
import { useClippings } from './hooks/useClippings'
import { SearchBar } from './components/SearchBar'
import { Sidebar } from './components/Sidebar'
import { BookDetail } from './components/BookDetail'
import { HighlightList } from './components/HighlightList'
import { Book } from './parser'

// ---- Markdown helpers ----

function formatHighlightMd(text: string, date: Date | null, metadata: string): string {
  const dateStr = date
    ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
    : metadata
  return `> ${text}\n> *${dateStr}*\n`
}

function bookToMarkdown(book: Book): string {
  const lines: string[] = [`# ${book.title}\n`]
  for (const h of book.highlights) {
    lines.push(formatHighlightMd(h.text, h.date, h.metadata))
  }
  return lines.join('\n')
}

function allBooksToMarkdown(books: Book[]): string {
  return books.map(bookToMarkdown).join('\n---\n\n')
}

function slugify(title: string): string {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return slug || 'kindle-highlights'
}

// ---- Browser download helper ----

function browserDownload(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ---- App ----

function App() {
  const {
    filteredBooks,
    filteredHighlights,
    selectedBook,
    query,
    dateFrom,
    dateTo,
    lastImported,
    lastImportedAt,
    kindleConnected,
    books,
    loadFromText,
    selectBook,
    setQuery,
    setDateFrom,
    setDateTo,
  } = useClippings()

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Total highlights in filtered view
  const totalHighlights = filteredBooks.reduce((acc, b) => acc + b.highlights.length, 0)

  // --- Import ---

  const handleImport = async () => {
    if (window.electronAPI) {
      const filePath = await window.electronAPI.showOpenDialog()
      if (!filePath) return
      const content = await window.electronAPI.readFile(filePath)
      const filename = filePath.split('/').pop() ?? filePath
      loadFromText(content, filename)
    } else {
      fileInputRef.current?.click()
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const content = ev.target?.result as string
      loadFromText(content, file.name)
    }
    reader.readAsText(file)
    // Reset so same file can be re-selected
    e.target.value = ''
  }

  // --- Copy All ---

  const handleCopyAll = async () => {
    try {
      const md = allBooksToMarkdown(books)
      if (window.electronAPI) {
        await window.electronAPI.writeClipboard(md)
      } else {
        await navigator.clipboard.writeText(md)
      }
    } catch (err) {
      console.error('handleCopyAll failed:', err)
    }
  }

  // --- Save All ---

  const handleSaveAll = async () => {
    try {
      const md = allBooksToMarkdown(books)
      if (window.electronAPI) {
        const savePath = await window.electronAPI.showSaveDialog('kindle-highlights.md')
        if (!savePath) return
        await window.electronAPI.saveFile(savePath, md)
      } else {
        browserDownload(md, 'kindle-highlights.md')
      }
    } catch (err) {
      console.error('handleSaveAll failed:', err)
    }
  }

  // --- Copy single book ---

  const handleCopyBook = async () => {
    if (!selectedBook) return
    try {
      const lines: string[] = [`# ${selectedBook.title}\n`]
      for (const h of filteredHighlights) {
        lines.push(formatHighlightMd(h.text, h.date, h.metadata))
      }
      const md = lines.join('\n')
      if (window.electronAPI) {
        await window.electronAPI.writeClipboard(md)
      } else {
        await navigator.clipboard.writeText(md)
      }
    } catch (err) {
      console.error('handleCopyBook failed:', err)
    }
  }

  // --- Save single book ---

  const handleSaveBook = async (book: Book) => {
    try {
      const lines: string[] = [`# ${book.title}\n`]
      for (const h of filteredHighlights) {
        lines.push(formatHighlightMd(h.text, h.date, h.metadata))
      }
      const md = lines.join('\n')
      const filename = `${slugify(book.title)}.md`
      if (window.electronAPI) {
        const savePath = await window.electronAPI.showSaveDialog(filename)
        if (!savePath) return
        await window.electronAPI.saveFile(savePath, md)
      } else {
        browserDownload(md, filename)
      }
    } catch (err) {
      console.error('handleSaveBook failed:', err)
    }
  }

  // --- Select book, keeping filtered highlights in sync ---

  const handleSelectBook = (book: Book) => {
    // Find the actual book (unfiltered) to get full reference
    const realBook = books.find(b => b.title === book.title) ?? book
    selectBook(realBook)
  }

  return (
    <div className="app">
      {/* Hidden file input for browser */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {/* Toolbar */}
      <div className="toolbar">
        <span className="toolbar-title">Kindle Clipper</span>
        <div className="toolbar-actions">
          <button className="btn btn-primary" onClick={handleImport}>
            ⬆ Import
          </button>
          <button
            className="btn btn-secondary"
            onClick={handleCopyAll}
            disabled={books.length === 0}
          >
            📋 Copy All
          </button>
          <button
            className="btn btn-secondary"
            onClick={handleSaveAll}
            disabled={books.length === 0}
          >
            ⬇ Save All .md
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <SearchBar
        query={query}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onQueryChange={setQuery}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
      />

      {/* Main two-panel area */}
      <div className="main-content">
        <Sidebar
          books={filteredBooks}
          selectedBook={selectedBook}
          onSelectBook={handleSelectBook}
          onSaveBook={handleSaveBook}
          totalHighlightCount={totalHighlights}
        />

        <div className="content-pane">
          {books.length === 0 ? (
            <div className="empty-state">
              <h3>No clippings loaded</h3>
              <p>Click "Import" to load your My Clippings.txt file.</p>
            </div>
          ) : !selectedBook ? (
            <BookDetail
              book={null}
              highlightCount={0}
              onCopy={handleCopyBook}
              onSave={() => {}}
            />
          ) : (
            <>
              <BookDetail
                book={selectedBook}
                highlightCount={filteredHighlights.length}
                onCopy={handleCopyBook}
                onSave={() => handleSaveBook(selectedBook)}
              />
              <div className="highlight-list-container">
                <HighlightList highlights={filteredHighlights} />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Status Bar */}
      <div className="status-bar">
        <span className="status-left">
          {lastImported
            ? `Last imported: ${lastImported} · ${lastImportedAt}`
            : 'No file imported yet'}
        </span>
        <span className="status-right">
          <span className={`status-dot${kindleConnected ? ' status-dot--connected' : ''}`} />
          {kindleConnected ? 'Kindle connected' : 'Kindle not connected'}
        </span>
      </div>
    </div>
  )
}

export default App
