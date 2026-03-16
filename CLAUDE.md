# CLAUDE.md — Developer Guide

This is an Electron + React + TypeScript desktop app for browsing and exporting Kindle highlights. See [README.md](README.md) for features and [Design Spec](docs/superpowers/specs/2026-03-16-kindle-clipper-design.md) for architecture, data model, and security decisions.

## Project Structure

```
src/
  parser/           — My Clippings.txt parser → Book[]
  hooks/            — useClippings: all app state
  components/       — Sidebar, SearchBar, BookDetail, HighlightList
  utils/            — markdown export formatters
  integrationtests/
electron/           — main.ts (IPC + Kindle watcher), preload.ts (contextBridge)
resources/          — sample .txt fixtures for tests
docs/               — design spec, runbook
archive/            — legacy Python script
```

## Key Files

| File | Purpose |
|------|---------|
| `src/parser/index.ts` | Parses clippings chunks into `Book[]`; handles Chinese/English dates, clipping limits, email stripping |
| `src/hooks/useClippings.ts` | Single source of truth: books, filters, selectedBook, Kindle connection state |
| `src/utils/markdown.ts` | `formatAll`, `formatBook`, `formatHighlight`, `slugify` |
| `src/App.tsx` | Layout + import/export handlers; uses `window.electronAPI` with browser fallback |
| `electron/main.ts` | BrowserWindow, 5 IPC handlers, `/Volumes` watcher for Kindle auto-detect |
| `electron/preload.ts` | contextBridge — exposes `window.electronAPI` to renderer |

## Data Flow

```
File import → parseClippings() → useClippings state → React components → markdown export
```

## Data Model

```typescript
interface Highlight {
  title: string      // book title (email-stripped)
  metadata: string   // raw Kindle metadata line
  text: string       // highlight text (always non-empty)
  date: Date | null
}

interface Book {
  title: string
  highlights: Highlight[]
}
```

See the [Design Spec](docs/superpowers/specs/2026-03-16-kindle-clipper-design.md) for the full spec including export format.

## Testing

```bash
npm test
```

Tests live in `src/**/*.test.ts` and `src/integrationtests/`. Fixtures are in `resources/`.

## Coding Conventions

- **No `nodeIntegration`** — all native access goes through contextBridge IPC only.
- **Guard `window.electronAPI`** — it is `undefined` in browser mode; always check before use. This is what enables the browser fallback.
- **Async file I/O** — use `fs.promises` throughout; no sync file calls.
- **IPC validation** — handlers validate file extensions (e.g., `.txt`) before reading.

## Commands

See [Runbook](docs/runbook.md) for all dev, build, and test commands.

## Architecture

See [Design Spec](docs/superpowers/specs/2026-03-16-kindle-clipper-design.md) for the full architecture diagram and security model.
