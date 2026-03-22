export type ClipKind = 'highlight' | 'note' | 'bookmark' | 'unknown'

export interface Highlight {
  title: string;      // cleaned book title (email stripped)
  metadata: string;   // raw metadata line (location/page info)
  text: string;       // highlight text (always non-empty — chunks with empty text are skipped during parsing)
  date: Date | null;  // parsed from Chinese or English date format
  kind: ClipKind;
}

export interface Book {
  title: string;
  highlights: Highlight[];
}

const CHUNK_DELIMITER = '==========';
const CLIPPING_LIMIT_TEXT = '<You have reached the clipping limit for this item>';
const EMAIL_REGEX = /\([^)]*@[^)]*\)/g;
const NOTE_MARKERS = ['Your Note', '您的笔记', '笔记'];
const HIGHLIGHT_MARKERS = ['Your Highlight', '标注'];
const BOOKMARK_MARKERS = ['Your Bookmark', '书签'];

// Chinese format: 2016年3月1日星期二 下午3:30:00
const ZH_DATE_REGEX = /(\d+)年(\d+)月(\d+)日.*?(\d+):(\d+):(\d+)/;

// English EU format: Added on Sunday, 5 January 2025 09:14:22
const EN_DATE_REGEX_EU = /Added on \w+,\s+(\d{1,2})\s+(\w+)\s+(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})/;

// English US format: Added on Wednesday, January 15, 2025 10:30:00 AM
const EN_DATE_REGEX_US = /Added on \w+,\s+(\w+)\s+(\d{1,2}),\s+(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})\s+(AM|PM)/i;

const MONTH_NAMES: Record<string, number> = {
  january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
  july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
};

function stripEmptyStrings(lines: string[]): string[] {
  return lines.map(s => s.trim()).filter(s => s !== '');
}

function extractDate(metadata: string): Date | null {
  // Try Chinese format first
  const zhMatch = ZH_DATE_REGEX.exec(metadata);
  if (zhMatch) {
    const year = parseInt(zhMatch[1], 10);
    const month = parseInt(zhMatch[2], 10) - 1;
    const day = parseInt(zhMatch[3], 10);
    let hour = parseInt(zhMatch[4], 10);
    const min = parseInt(zhMatch[5], 10);
    const sec = parseInt(zhMatch[6], 10);
    if (metadata.includes('下午') && hour !== 12) hour += 12;
    if (metadata.includes('上午') && hour === 12) hour = 0;
    return new Date(year, month, day, hour, min, sec);
  }

  // Try English EU format: D Month YYYY HH:MM:SS (24h)
  const euMatch = EN_DATE_REGEX_EU.exec(metadata);
  if (euMatch) {
    const day = parseInt(euMatch[1], 10);
    const month = MONTH_NAMES[euMatch[2].toLowerCase()];
    const year = parseInt(euMatch[3], 10);
    const hour = parseInt(euMatch[4], 10);
    const min = parseInt(euMatch[5], 10);
    const sec = parseInt(euMatch[6], 10);
    if (month === undefined) return null;
    return new Date(year, month, day, hour, min, sec);
  }

  // Try English US format: Month D, YYYY H:MM:SS AM/PM (12h)
  const usMatch = EN_DATE_REGEX_US.exec(metadata);
  if (usMatch) {
    const month = MONTH_NAMES[usMatch[1].toLowerCase()];
    const day = parseInt(usMatch[2], 10);
    const year = parseInt(usMatch[3], 10);
    let hour = parseInt(usMatch[4], 10);
    const min = parseInt(usMatch[5], 10);
    const sec = parseInt(usMatch[6], 10);
    const ampm = usMatch[7].toUpperCase();
    if (month === undefined) return null;
    if (ampm === 'PM' && hour !== 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;
    return new Date(year, month, day, hour, min, sec);
  }

  return null;
}

function detectClipKind(metadata: string): ClipKind {
  if (NOTE_MARKERS.some(marker => metadata.includes(marker))) {
    return 'note';
  }
  if (HIGHLIGHT_MARKERS.some(marker => metadata.includes(marker))) {
    return 'highlight';
  }
  if (BOOKMARK_MARKERS.some(marker => metadata.includes(marker))) {
    return 'bookmark';
  }
  return 'unknown';
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
    const kind = detectClipKind(metadata);

    // Skip bookmark-only entries and other empty clips with no body text.
    if (text === '') continue;

    // Skip Kindle clipping limit placeholder text
    if (text === CLIPPING_LIMIT_TEXT) continue;

    const date = extractDate(metadata);

    const highlight: Highlight = { title, metadata, text, date, kind };

    if (!booksMap.has(title)) {
      const book: Book = { title, highlights: [] };
      booksMap.set(title, book);
      bookOrder.push(title);
    }

    booksMap.get(title)!.highlights.push(highlight);
  }

  return bookOrder.map(title => booksMap.get(title)!);
}
