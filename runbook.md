# Runbook

Operational reference for kindle-clip-processor.

## Prerequisites

- Node.js 18+
- npm 9+

## Setup

```bash
npm install
```

## Development

```bash
# Web only (Vite dev server → localhost:5173)
npm run dev

# Full Electron app with hot reload
npm run electron:dev
```

## Testing

```bash
npm test
```

Runs all `*.test.ts` files via `tsx`. Fixtures are in `resources/`.

## Building

```bash
# Web app → dist/
npm run build

# Preview web build locally
npm run preview

# macOS .dmg → release/
npm run electron:build
```

## Using the App

1. **Import highlights**: click "Open" to choose `My Clippings.txt`, or plug in your Kindle — the app auto-detects it at `/Volumes/Kindle/` on macOS.
2. **Filter**: use the search bar to search by keyword, and the date picker to filter by date range.
3. **Export**: click "Copy" or "Save" to export a single book or all books as markdown.

## Troubleshooting

**Kindle not detected**
Check that the file exists at `/Volumes/Kindle/documents/My Clippings.txt`. The app watches `/Volumes` for mount events — replug the Kindle if the app was open before connecting.

**Build issues**
Verify your Node.js version: `node --version` (must be 18+). Delete `node_modules` and re-run `npm install` if dependencies seem stale.
