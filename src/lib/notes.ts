import { getCollection, type CollectionEntry } from 'astro:content';

/**
 * Queries over the `notes` content collection, shared by every page and feed
 * that lists essays (front page, /notes, the article route, the raw Markdown
 * mirror, RSS, llms.txt), so they always agree on what is published.
 */

export type Note = CollectionEntry<'notes'>;

/** Average adult silent-reading speed for non-fiction, in words per minute. */
const WORDS_PER_MINUTE = 220;

/**
 * Published notes, newest first. Drafts are visible in `astro dev` so they can
 * be previewed, and left out of production builds.
 */
export async function getPublishedNotes(): Promise<Note[]> {
  const entries = await getCollection('notes', ({ data }) => import.meta.env.DEV || !data.draft);
  return entries.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}

/** Root-relative URL of a note's page. Trailing slash matches the `directory` build format. */
export function noteHref(note: Note): string {
  return `/notes/${note.slug}/`;
}

/** Root-relative URL of a note's raw Markdown mirror. */
export function noteMarkdownHref(note: Note): string {
  return `/notes/${note.slug}.md`;
}

/**
 * Words a reader actually reads: the Markdown with code blocks, inline code,
 * MDX import/export lines, HTML/JSX tags, and link targets removed.
 */
export function countWords(markdown: string): number {
  const prose = markdown
    .replace(/^(```|~~~)[\s\S]*?^\1/gm, ' ') // fenced code blocks
    .replace(/`[^`\n]*`/g, ' ') // inline code
    .replace(/^\s*(import|export)\s.*$/gm, ' ') // MDX import/export lines
    .replace(/<[^>]+>/g, ' ') // HTML / JSX tags
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1') // images: keep alt text
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // links: keep link text
    .replace(/\|/g, ' '); // table cell separators
  // Tokens with no letter or digit ("##", ">", "---", "*") are Markdown
  // punctuation, not words. Hyphenated words count once.
  return prose.split(/\s+/).filter((word) => /[\p{L}\p{N}]/u.test(word)).length;
}

export interface NoteStats {
  readonly words: number;
  /** Whole minutes, at least 1. */
  readonly minutes: number;
}

export function noteStats(note: Note): NoteStats {
  const words = countWords(note.body);
  return { words, minutes: Math.max(1, Math.round(words / WORDS_PER_MINUTE)) };
}

export interface NoteYearGroup {
  readonly year: number;
  readonly notes: Note[];
}

/**
 * Groups notes (already sorted newest first) by publication year. Each row in
 * the list already shows its month, so there is no month level.
 */
export function groupNotesByYear(notes: readonly Note[]): NoteYearGroup[] {
  const years: NoteYearGroup[] = [];
  for (const note of notes) {
    const year = note.data.pubDate.getUTCFullYear();
    const group = years.find((g) => g.year === year);
    if (group) group.notes.push(note);
    else years.push({ year, notes: [note] });
  }
  return years;
}
