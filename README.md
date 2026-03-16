# kindle-clip-processor

### Context
A simple script to organize Kindle clips by book title, print the organized note and store to local file.

> Recommend run with python3.

### How it works
* Output organized note and store to resources: `python3 kindle_clipper_processor.py`
* Filter out notes before a date: `python3 kindle_clipper_processor.py -d 2022-03-01`

### TODO
[x] Add date filtering flag
[] Add book title filtering flat
[] Choose to print raw log or organized logs group by book

## Kindle Clipper App

A GUI app for browsing and exporting Kindle highlights. Runs as a macOS desktop app (Electron) or standalone web app.

### Requirements
- Node.js 18+
- npm 9+

### Development
```bash
npm install
npm run dev              # Web app only (Vite dev server)
npm run electron:dev     # Full Electron app with hot reload
```

### Build
```bash
npm run build            # Web app build → dist/
npm run electron:build   # macOS .dmg → release/
```

### Web version
Open `dist/index.html` in a browser after running `npm run build`. File import uses the browser's file picker.
