import { Highlight } from '../parser'

interface HighlightListProps {
  highlights: Highlight[]
}

function formatDate(date: Date): string {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`
}

export function HighlightList({ highlights }: HighlightListProps) {
  if (highlights.length === 0) {
    return <div className="highlight-list-empty">No highlights to show.</div>
  }

  return (
    <div className="highlight-list">
      {highlights.map((h) => (
        <div key={`${h.metadata}-${h.text.slice(0, 40)}`} className="highlight-card">
          <p className="highlight-text">{h.text}</p>
          <p className="highlight-meta">
            {h.date ? formatDate(h.date) : h.metadata}
          </p>
        </div>
      ))}
    </div>
  )
}
