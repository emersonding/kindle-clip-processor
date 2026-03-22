# kindle-clip-processor

Browse, search, filter, and export your Kindle clips.

Runs as a macOS desktop app (Electron) or standalone web app — same codebase — and now also includes a standalone Go CLI named `kindle-clip` for terminal-first workflows.

## Features

- Parse `My Clippings.txt` exported from any Kindle device
- Two-panel UI: book list sidebar + clip content pane
- Global keyword search and date range filter across all books
- Markdown export per-book or all books (copy to clipboard or save as `.md`)
- Auto-detect mounted Kindle at `/Volumes/Kindle/` (macOS)
- Browser fallback — works without Electron via file picker and clipboard API
- Standalone `kindle-clip` binary with saved-path config and Markdown-first output

## Screenshots

![English highlights view](docs/images/screenshot-1.png)
![Chinese highlights view](docs/images/screenshot-2.png)

## Quick Start

```bash
npm install
npm run electron:dev   # launch desktop app with hot reload
npm test               # run the TypeScript test suites
```

## CLI (`kindle-clip`)

The repo now includes a standalone Go CLI so users can run `kindle-clip ...` directly after installing a binary, without `npm run`, `tsx`, or `./` prefixes. The CLI is suitable for quick kindle clipper file process, print processed notes and highlights, do common searches e.g. for selected keyword, date and author, and is ai agent friendly (easy to be directly used by claude code, codex, openclaw, etc.).

### Install from GitHub Releases

Method 1: use the install script:
```bash
curl -fsSL https://raw.githubusercontent.com/emersonding/kindle-clip-processor/master/scripts/install-kindle-clip.sh \
  | KINDLE_CLIP_REPO=emersonding/kindle-clip-processor sh
```

By default, the installer writes the binary to `~/.local/bin/kindle-clip`. Override that with `KINDLE_CLIP_INSTALL_DIR=/your/bin/path` if needed, and make sure the target directory is on your `PATH`.

Method 2: download the archive for your platform directly from the GitHub Releases page, extract it, and move `kindle-clip` into a directory on your `PATH`, such as `/usr/local/bin` on macOS.

The repository includes:
- `.goreleaser.yaml` for building release archives and a Homebrew formula scaffold
- `scripts/install-kindle-clip.sh` for curl-based installation from GitHub Releases

### Build locally

If you are developing locally instead of installing a release binary:

```bash
go build -o ./bin/kindle-clip ./cmd/kindle-clip
./bin/kindle-clip help
```

### Usage

```bash
# save a default clippings directory or file once
kindle-clip set ~/Documents/Kindle

# list books using the saved path
kindle-clip list

# list books for a specific directory or file
kindle-clip list ~/Documents/Kindle --author "Daniel Kahneman"

# print all clips for all books
kindle-clip print --book "Sapiens"

# print all clips for one book
kindle-clip print --book "Sapiens"

# search note text
kindle-clip search confidence

# search and save results to a file
kindle-clip search confidence --export-md ./confidence.md

# print filtered clips and save them to a file
kindle-clip print --book "Sapiens" --export-md ./sapiens-notes.md

# show command help
kindle-clip --help
kindle-clip search --help
```

`list`, `print`, and `search` support these filters:

- `--from YYYY-MM-DD`
- `--to YYYY-MM-DD`
- `--book TEXT`
- `--author TEXT`
- `--query TEXT` to filter clip text
- `--export-md PATH` to save Markdown to a file
- `--verbose` to include metadata in Markdown output

For `search`, prefer the positional keyword for readability, though `--query` is also accepted:

```bash
kindle-clip search confidence
kindle-clip search --query confidence
```

`print` and `search` emit grouped Markdown with `# Book Title (Author)` headings by default. Highlights render as `> content`, while notes/comments render as `> **Note**: content`. Add `--verbose` when you also want the original Kindle metadata line under each clip.

`list` emits a compact book list by default. Add `--verbose` to include clip counts and first/last clip timestamps.

Every command also supports `--help` and `-h` for command-specific usage.

### Saved path behavior

`kindle-clip` resolves the clippings path in this order:

1. explicit file or directory argument
2. `KINDLE_CLIP_PATH`
3. saved config in `~/.config/kindle-clip/config.json` or `$XDG_CONFIG_HOME/kindle-clip/config.json`

This keeps repository directories clean while still making repeated CLI use ergonomic.

## More

- [Runbook](runbook.md) — full command reference, env setup, troubleshooting
- [Design Spec](docs/superpowers/specs/2026-03-16-kindle-clipper-design.md) — architecture, data model, security
- [CLAUDE.md](CLAUDE.md) — developer and AI guide

## Archive

`archive/` contains the original Python CLI script (`kindle_clipper_processor.py`).
