# Kindle Clipper — Design Spec

**Date:** 2026-03-16
**Branch:** feat/electron-app
**Status:** Implemented

## Overview

A GUI app for browsing, searching, and exporting Kindle highlights. Runs as both a macOS Electron desktop app and a standalone web app from the same codebase.

## Tech Stack

| Component | Choice |
|---|---|
| Framework | Electron 28 + React 18 + TypeScript 5 |
| Bundler | Vite 5 |
| Architecture | Web-first + contextBridge IPC for native features |
| Packaging | electron-builder (macOS dmg + zip) |

## Architecture

The React app is the primary artifact. Electron wraps it and injects `window.electronAPI` via a preload script (contextBridge). When running in the browser, `window.electronAPI` is `undefined` and the app falls back to browser APIs.

```
React App (src/)
  └── window.electronAPI?  (graceful degradation)
       ├── Electron: contextBridge → IPC → main process → Node.js
       └── Browser: File API, navigator.clipboard, <a download>
```

## Features

- Import `My Clippings.txt` via file picker or auto-detect mounted Kindle at `/Volumes/Kindle/`
- Two-panel layout: book list (sidebar) + highlight content pane
- Global keyword search + date range filter across all books
- Per-book and all-books markdown export (Copy to clipboard or Save as .md file)
- Light mode UI

## Data Model

```typescript
interface Highlight {
  title: string      // book title (email-stripped)
  metadata: string   // raw Kindle metadata line
  text: string       // highlight text (always non-empty)
  date: Date | null  // parsed from Chinese 年月日 format with AM/PM handling
}

interface Book {
  title: string
  highlights: Highlight[]
}
```

## Markdown Export Format

```markdown
# Book Title

> Highlight text.
> *2015-09-24 05:08*

> Another highlight.
> *2015-10-01 10:30*
```

All books: separated by `---`.

## File Structure

```
src/parser/         — TypeScript port of Python clippings parser
src/hooks/          — useClippings state management hook
src/components/     — Sidebar, SearchBar, BookDetail, HighlightList
src/utils/markdown  — formatBook, formatAll, formatDate, slugify
electron/           — main.ts (BrowserWindow + IPC), preload.ts (contextBridge)
```

## Security

- `nodeIntegration: false`, `contextIsolation: true`
- `read-file` IPC handler validates `.txt` extension
- All file I/O routed through async `fs.promises`
