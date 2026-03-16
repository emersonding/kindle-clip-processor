# Archive — Standalone Python Script

This directory contains the original standalone Python script for processing Kindle clippings. It is preserved for reference but superseded by the Electron + React app in the project root.

## What it does

Reads `resource/My Clippings.txt`, groups highlights by book title, and writes organized output to `resource/output.txt`.

## Usage

```bash
# Process all clips
python3 kindle_clipper_processor.py

# Filter highlights after a date
python3 kindle_clipper_processor.py -d 2022-03-01

# Copy from a mounted Kindle and process
./run.sh 2023-01-01
```

## Files

| File | Description |
|---|---|
| `kindle_clipper_processor.py` | Main script — parses and organizes clippings |
| `test_kindle_clipper_processor.py` | Unit tests |
| `run.sh` | Shell wrapper — copies from `/Volumes/Kindle/` then runs the script |
