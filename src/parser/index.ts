export interface Highlight {
  title: string;      // cleaned book title (email stripped)
  metadata: string;   // raw metadata line (location/page info in Chinese)
  text: string;       // highlight text (always non-empty — chunks with empty text are skipped during parsing)
  date: Date | null;  // parsed from Chinese date format
}

export interface Book {
  title: string;
  highlights: Highlight[];
}

const CHUNK_DELIMITER = '==========';
const EMAIL_REGEX = /\([^)]*@[^)]*\)/g;
const DATE_REGEX = /(\d+)年(\d+)月(\d+)日.*?(\d+):(\d+):(\d+)/;

function stripEmptyStrings(lines: string[]): string[] {
  return lines.map(s => s.trim()).filter(s => s !== '');
}

function extractDate(metadata: string): Date | null {
  const match = DATE_REGEX.exec(metadata);
  if (!match) return null;
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10) - 1; // 0-indexed
  const day = parseInt(match[3], 10);
  let hour = parseInt(match[4], 10);
  const min = parseInt(match[5], 10);
  const sec = parseInt(match[6], 10);
  if (metadata.includes('下午') && hour !== 12) hour += 12;
  if (metadata.includes('上午') && hour === 12) hour = 0;
  return new Date(year, month, day, hour, min, sec);
}

export function parseClippings(content: string): Book[] {
  const rawChunks = content.split(CHUNK_DELIMITER);
  const booksMap = new Map<string, Book>();
  const bookOrder: string[] = [];

  for (const rawChunk of rawChunks) {
    const lines = stripEmptyStrings(rawChunk.split('\n'));

    // Need at least title + metadata
    if (lines.length < 2) continue;

    const title = lines[0].replace(EMAIL_REGEX, '').trim();
    const metadata = lines[1];
    const text = lines.length >= 3 ? lines.slice(2).join('\n') : '';

    // Skip highlights with empty text (bookmarks/notes with no content)
    if (text === '') continue;

    const date = extractDate(metadata);

    const highlight: Highlight = { title, metadata, text, date };

    if (!booksMap.has(title)) {
      const book: Book = { title, highlights: [] };
      booksMap.set(title, book);
      bookOrder.push(title);
    }

    booksMap.get(title)!.highlights.push(highlight);
  }

  return bookOrder.map(title => booksMap.get(title)!);
}
