interface SearchBarProps {
  query: string
  dateFrom: string
  dateTo: string
  onQueryChange: (q: string) => void
  onDateFromChange: (d: string) => void
  onDateToChange: (d: string) => void
}

export function SearchBar({
  query,
  dateFrom,
  dateTo,
  onQueryChange,
  onDateFromChange,
  onDateToChange,
}: SearchBarProps) {
  const hasFilters = query !== '' || dateFrom !== '' || dateTo !== ''

  const handleClear = () => {
    onQueryChange('')
    onDateFromChange('')
    onDateToChange('')
  }

  return (
    <div className="search-bar">
      <div className="search-input-wrapper">
        <span className="search-icon">🔍</span>
        <input
          type="text"
          className="search-input"
          placeholder="Search clips..."
          value={query}
          onChange={e => onQueryChange(e.target.value)}
        />
      </div>
      <label htmlFor="date-from" className="date-label">From:</label>
      <input
        id="date-from"
        type="date"
        className="date-input"
        value={dateFrom}
        onChange={e => onDateFromChange(e.target.value)}
      />
      <label htmlFor="date-to" className="date-label">To:</label>
      <input
        id="date-to"
        type="date"
        className="date-input"
        value={dateTo}
        onChange={e => onDateToChange(e.target.value)}
      />
      {hasFilters && (
        <button className="btn-clear" onClick={handleClear}>
          Clear
        </button>
      )}
    </div>
  )
}
