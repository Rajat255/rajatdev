/**
 * BookShelf — the Reading Room on /threads (React island).
 *
 * Books are grouped by shelf ("Reading now", "Finished"), each with its status,
 * language, and a short margin note. Filter buttons narrow the list to what's
 * being read, what's finished, or the French books.
 *
 * The server renders the unfiltered list, so every book is on the page before
 * (and without) JavaScript; only filtering waits for hydration. The data arrives
 * as props from the validated content module, so Zod stays on the server.
 */
import { useId, useState } from 'react';

import type { Book, BookLanguage, BookStatus } from '../../data/books';

export interface BookShelfProps {
  readonly books: readonly Book[];
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

const SHELF_ORDER: readonly BookStatus[] = ['reading', 'completed', 'antilibrary'];

function matches(book: Book, filter: Filter): boolean {
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

export default function BookShelf({ books, shelfTitles, statusTags, languageNames }: BookShelfProps) {
  const [filter, setFilter] = useState<Filter>('all');
  const countId = useId();

  const visible = books.filter((book) => matches(book, filter));
  const shelves = SHELF_ORDER.map((status) => ({
    status,
    books: visible.filter((book) => book.status === status),
  })).filter((shelf) => shelf.books.length > 0);

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
            <h3 id={`shelf-${shelf.status}`} className="text-center text-lg font-semibold tracking-[0.18em] text-accent">
              {shelfTitles[shelf.status]}
            </h3>
            <ul className="mt-6 space-y-8" role="list">
              {shelf.books.map((book) => (
                <li key={`${book.title}-${book.author}`}>
                  <p className="flex flex-wrap items-baseline justify-between gap-x-4">
                    <span>
                      <cite
                        className="text-[1.35rem] font-semibold not-italic text-ink"
                        lang={book.language === 'FR' ? 'fr' : undefined}
                      >
                        {book.title}
                      </cite>
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
                  <p className="mt-1 pl-4 text-base text-muted">{book.category}</p>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
