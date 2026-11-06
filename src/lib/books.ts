import { getCollection, type CollectionEntry } from 'astro:content';

import type { BOOK_STATUSES } from '../content/config';

/**
 * Queries over the `books` content collection (one Markdown file per book in
 * `src/content/books/`), shared by /reads, each book's page, /now, the
 * JSON-LD, and llms.txt, so they always agree.
 */

export type BookEntry = CollectionEntry<'books'>;
export type BookStatus = (typeof BOOK_STATUSES)[number];

/** Group headings on /reads, one per status, in display order. */
export const SHELF_TITLES: Record<BookStatus, string> = {
  reading: 'Reading now',
  completed: 'Finished',
  antilibrary: 'Waiting on the shelf',
};

export const SHELF_ORDER: readonly BookStatus[] = ['reading', 'completed', 'antilibrary'];

/** The short status tag printed beside each book. */
export const STATUS_TAGS: Record<BookStatus, string> = {
  reading: 'reading',
  completed: 'finished',
  antilibrary: 'unread',
};

/** Value for `lang` on a book's title: only when it isn't the page's English. */
export function titleLang(book: BookEntry): string | undefined {
  return book.data.language.startsWith('en') ? undefined : book.data.language;
}

/** Root-relative URL of a book's page. */
export function bookHref(book: BookEntry): string {
  return `/reads/${book.slug}/`;
}

/**
 * True when the book's Markdown body has real text, not just the placeholder
 * comment the template starts with.
 */
export function hasWriting(book: BookEntry): boolean {
  return book.body.replace(/<!--[\s\S]*?-->/g, '').trim().length > 0;
}

/**
 * Sort key within a shelf: most recently finished (or started) first; books
 * without dates fall back to title order.
 */
function sortDate(book: BookEntry): number {
  return (book.data.finished ?? book.data.started)?.valueOf() ?? Number.NEGATIVE_INFINITY;
}

/**
 * Published books, grouped by status in shelf order, newest first within each.
 * Drafts are visible in `astro dev` and left out of production builds.
 */
export async function getBooks(): Promise<BookEntry[]> {
  const entries = await getCollection('books', ({ data }) => import.meta.env.DEV || !data.draft);
  return entries.sort(
    (a, b) =>
      SHELF_ORDER.indexOf(a.data.status) - SHELF_ORDER.indexOf(b.data.status) ||
      sortDate(b) - sortDate(a) ||
      a.data.title.localeCompare(b.data.title),
  );
}

export function booksByStatus(books: readonly BookEntry[], status: BookStatus): BookEntry[] {
  return books.filter((book) => book.data.status === status);
}
