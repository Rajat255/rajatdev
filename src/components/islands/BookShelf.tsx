/**
 * BookShelf — the books on /reads (React island).
 *
 * Books are grouped by shelf ("Reading now", "Finished"), each with its status,
 * language, and a short margin note. Each title links to the book's own page,
 * where the longer writing lives. Filter buttons narrow the list to what's
 * being read, what's finished, or the French books.
 *
 * The server renders the unfiltered list, so every book is on the page before
 * (and without) JavaScript; only filtering waits for hydration. The data arrives
 * as plain props (`ShelfBook`), so nothing from the content layer ships to the
 * browser.
 */
import { useId, useState } from 'react';

import type { BookLanguage, BookStatus, ShelfBook } from '../../lib/books';

export interface BookShelfProps {
  readonly books: readonly ShelfBook[];
  readonly shelfOrder: readonly BookStatus[];
  readonly shelfTitles: Readonly<Record<BookStatus, string>>;
  readonly statusTags: Readonly<Record<BookStatus, string>>;
  readonly languageNames: Readonly<Record<BookLanguage, string>>;
}

type Filter = 'all' | 'reading' | 'read' | 'fr';

const FILTERS: readonly { readonly id: Filter; readonly label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'reading', label: 'Reading' },
  { id: 'read', label: 'Read' },
  { id: 'fr', label: 'FR' },
];

function matches(book: ShelfBook, filter: Filter): boolean {
  switch (filter) {
    case 'all':
      return true;
    case 'reading':
      return book.status === 'reading';
    case 'read':
      return book.status === 'completed';
    case 'fr':
      return book.language === 'FR';
  }
}

export default function BookShelf({ books, shelfOrder, shelfTitles, statusTags, languageNames }: BookShelfProps) {
  const [filter, setFilter] = useState<Filter>('all');
  const countId = useId();

  const visible = books.filter((book) => matches(book, filter));
  const shelves = shelfOrder
    .map((status) => ({ status, books: visible.filter((book) => book.status === status) }))
    .filter((shelf) => shelf.books.length > 0);

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-center gap-x-5 gap-y-1 text-base">
        <span className="text-muted">Show</span>
        <div role="group" aria-label="Filter the books" aria-describedby={countId} className="flex gap-x-4">
          {FILTERS.map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={filter === option.id}
              onClick={() => setFilter(option.id)}
              className="min-h-[44px] text-ink underline-offset-[0.3em] transition-colors hover:text-accent aria-pressed:text-accent aria-pressed:underline"
            >
              {option.label}
              {option.id === 'fr' && <span className="sr-only"> (French)</span>}
            </button>
          ))}
        </div>
        <span id={countId} aria-live="polite" className="text-muted">
          {visible.length} of {books.length}
        </span>
      </div>

      <div className="mt-8 space-y-12">
        {shelves.map((shelf) => (
          <section key={shelf.status} aria-labelledby={`shelf-${shelf.status}`}>
            <h2 id={`shelf-${shelf.status}`} className="text-center text-lg font-semibold tracking-[0.18em] text-accent">
              {shelfTitles[shelf.status]}
            </h2>
            <ul className="mt-6 space-y-8" role="list">
              {shelf.books.map((book) => (
                <li key={book.slug}>
                  <p className="flex flex-wrap items-baseline justify-between gap-x-4">
                    <span>
                      <a href={book.href} className="link">
                        <cite
                          className="text-[1.35rem] font-semibold not-italic text-ink"
                          lang={book.language === 'FR' ? 'fr' : undefined}
                        >
                          {book.title}
                        </cite>
                      </a>
                      {book.translatedTitle && <span className="italic text-muted"> ({book.translatedTitle})</span>}
                    </span>
                    <span className="smallcaps text-muted">
                      {statusTags[book.status]}
                      <span aria-hidden="true"> · </span>
                      <abbr title={languageNames[book.language]} className="no-underline">
                        {book.language.toLowerCase()}
                      </abbr>
                    </span>
                  </p>
                  <p className="italic text-ink">
                    {book.author}, {book.year}
                  </p>
                  <p className="mt-2 border-l-2 border-accent/60 pl-4 text-ink">{book.notes}</p>
                  <p className="mt-1 pl-4 text-base text-muted">
                    {book.category}
                    {book.hasWriting && (
                      <>
                        <span aria-hidden="true"> · </span>
                        <a href={book.href} className="link">
                          Read my notes
                          <span className="sr-only"> on {book.title}</span>
                        </a>
                      </>
                    )}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
