import { z } from 'zod';

/**
 * Books content: the shelf on `/library`.
 *
 * EDIT THIS FILE to log a book. Within each status group, books render in the
 * order given, so put the most recent first.
 *
 *  - `reading`      currently on the nightstand
 *  - `completed`    finished, filed on the shelf
 *  - `antilibrary`  bought, not yet read (the section only appears once it has
 *                   at least one book)
 */

export const BookStatus = z.enum(['reading', 'completed', 'antilibrary']);
export type BookStatus = z.infer<typeof BookStatus>;

export const BookLanguage = z.enum(['EN', 'FR']);
export type BookLanguage = z.infer<typeof BookLanguage>;

export const Book = z.object({
  title: z.string().min(1),
  /** Optional English title for a book read in another language. */
  translatedTitle: z.string().min(1).optional(),
  author: z.string().min(1),
  /** Year of first publication. */
  year: z.number().int().min(1000).max(2100),
  status: BookStatus,
  language: BookLanguage,
  /** Genre line, printed beside the year. */
  category: z.string().min(1).max(60),
  /** A short personal note: one or two sentences, not a review. */
  notes: z.string().min(1).max(320),
});
export type Book = z.infer<typeof Book>;

export const Books = z
  .array(Book)
  .min(1)
  .refine(
    (list) => new Set(list.map((b) => `${b.title}::${b.author}`)).size === list.length,
    'each book must appear once',
  );
export type Books = z.infer<typeof Books>;

export const books: Books = Books.parse([
  {
    title: 'Trust',
    author: 'Hernan Diaz',
    year: 2022,
    status: 'reading',
    language: 'EN',
    category: 'Fiction · Capital & Narrative',
    notes:
      'An investigation into wealth, power, and who gets to write the official version of reality—told across four competing manuscripts that constantly pull the rug out from under the reader.',
  },
  {
    title: "L'Étranger",
    translatedTitle: 'The Stranger',
    author: 'Albert Camus',
    year: 1942,
    status: 'reading',
    language: 'FR',
    category: 'Philosophy · Absurdism (B1 French)',
    notes:
      'Reading Camus in the original French—deceptively simple sentences where the Algerian sun and quiet existential indifference do all the heavy lifting.',
  },
  {
    title: 'A Thousand Splendid Suns',
    author: 'Khaled Hosseini',
    year: 2007,
    status: 'completed',
    language: 'EN',
    category: 'Historical Fiction',
    notes:
      'A devastating, deeply human portrait of endurance, unlikely friendship, and quiet defiance across generations in Kabul.',
  },
  {
    title: 'Le Petit Prince',
    author: 'Antoine de Saint-Exupéry',
    year: 1943,
    status: 'completed',
    language: 'FR',
    category: 'Classic · Fable (FR)',
    notes:
      'The rite of passage for anyone learning French, and still sharper about adult absurdity and bureaucracy than most books ten times its length.',
  },
]);

/** Books with a given status, in authored order. */
export function booksByStatus(status: BookStatus, list: Books = books): Books {
  return list.filter((book) => book.status === status);
}

/** Group headings on the shelf page, one per status. */
export const SHELF_TITLES: Record<BookStatus, string> = {
  reading: 'Reading now',
  completed: 'Finished',
  antilibrary: 'Waiting on the shelf',
};

/** The short status tag printed beside each book. */
export const STATUS_TAGS: Record<BookStatus, string> = {
  reading: 'reading',
  completed: 'finished',
  antilibrary: 'unread',
};

/** Spelled-out language names for badges and filter labels. */
export const LANGUAGE_NAMES: Record<BookLanguage, string> = {
  EN: 'English',
  FR: 'Français',
};
