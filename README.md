# kindle-clip-processor

Browse, search, filter, and export your Kindle highlights.

Runs as a macOS desktop app (Electron) or standalone web app — same codebase.

## Features

- Parse `My Clippings.txt` exported from any Kindle device
- Two-panel UI: book list sidebar + highlight content pane
- Global keyword search and date range filter across all books
- Markdown export per-book or all books (copy to clipboard or save as `.md`)
- Auto-detect mounted Kindle at `/Volumes/Kindle/` (macOS)
- Browser fallback — works without Electron via file picker and clipboard API

## Screenshots

![English highlights view](docs/images/screenshot-1.png)
![Chinese highlights view](docs/images/screenshot-2.png)

## Quick Start

```bash
npm install
npm run electron:dev   # launch desktop app with hot reload
npm test               # run all tests
```

## More

- [Runbook](docs/runbook.md) — full command reference, env setup, troubleshooting
- [Design Spec](docs/superpowers/specs/2026-03-16-kindle-clipper-design.md) — architecture, data model, security
- [CLAUDE.md](CLAUDE.md) — developer and AI guide

## Archive

`archive/` contains the original Python CLI script (`kindle_clipper_processor.py`).
