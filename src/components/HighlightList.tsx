import { Highlight } from '../parser'
import { formatDate } from '../utils/markdown'

interface HighlightListProps {
  highlights: Highlight[]
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
