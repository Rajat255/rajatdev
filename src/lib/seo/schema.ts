/**
 * JSON-LD builders.
 *
 * Every node is built from the same data modules the pages render, so the
 * structured data cannot drift from what a visitor reads. Nodes reference each
 * other by `@id` and are emitted together as one `@graph` per page by SEO.astro.
 */
import { SITE_CONFIG, absoluteUrl } from '../../config/site';
import { bookHref, type BookEntry } from '../books';
import { certifications } from '../../data/certifications';
import { experience } from '../../data/experience';
import { profile } from '../../data/profile';
import { noteHref, type Note, type NoteStats } from '../notes';

/** One JSON-LD node. Values are whatever schema.org allows, so this stays loose. */
export type JsonLdNode = { '@type': string | string[]; '@id'?: string } & Record<string, unknown>;

export const PERSON_ID = absoluteUrl('/#person');
export const WEBSITE_ID = absoluteUrl('/#website');
export const BLOG_ID = absoluteUrl('/threads/#blog');

const ref = (id: string) => ({ '@id': id });

/** Wraps nodes in a single document for a `<script type="application/ld+json">`. */
export function graph(nodes: readonly JsonLdNode[]): Record<string, unknown> {
  return { '@context': 'https://schema.org', '@graph': nodes };
}

export function personNode(): JsonLdNode {
  const [city, ...rest] = profile.location.split(',').map((part) => part.trim());
  const current = experience.find((role) => role.end === 'Present');

  return {
    '@type': 'Person',
    '@id': PERSON_ID,
    name: profile.name,
    url: absoluteUrl('/'),
    jobTitle: profile.role,
    description: profile.summary,
    email: `mailto:${profile.email}`,
    address: {
      '@type': 'PostalAddress',
      addressLocality: city,
      ...(rest.length > 0 ? { addressCountry: rest.join(', ') } : {}),
    },
    ...(current ? { worksFor: { '@type': 'Organization', name: current.company } } : {}),
    knowsAbout: profile.knowsAbout,
    knowsLanguage: ['en', 'fr'],
    hasCredential: certifications.map((cert) => ({
      '@type': 'EducationalOccupationalCredential',
      name: cert.name,
      credentialCategory: 'certification',
      recognizedBy: { '@type': 'Organization', name: cert.issuer },
      ...(cert.verifyUrl ? { url: cert.verifyUrl } : {}),
    })),
    sameAs: profile.socials.filter((s) => /^https?:\/\//.test(s.url)).map((s) => s.url),
  };
}

export function websiteNode(): JsonLdNode {
  return {
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    url: absoluteUrl('/'),
    name: SITE_CONFIG.name,
    description: SITE_CONFIG.description,
    inLanguage: SITE_CONFIG.language,
    author: ref(PERSON_ID),
    publisher: ref(PERSON_ID),
  };
}

interface PageNodeOptions {
  readonly path: string;
  readonly name: string;
  readonly description: string;
  /** e.g. 'WebPage', 'ProfilePage', 'CollectionPage', 'AboutPage'. */
  readonly type?: string;
  readonly mainEntity?: Record<string, unknown>;
}

export function webPageNode({ path, name, description, type = 'WebPage', mainEntity }: PageNodeOptions): JsonLdNode {
  const url = absoluteUrl(path);
  return {
    '@type': type,
    '@id': `${url}#webpage`,
    url,
    name,
    description,
    inLanguage: SITE_CONFIG.language,
    isPartOf: ref(WEBSITE_ID),
    ...(mainEntity ? { mainEntity } : {}),
  };
}

/** `ProfilePage` about Rajat, for `/` and `/builds`. */
export function profilePageNode(path: string, name: string, description: string): JsonLdNode {
  return webPageNode({ path, name, description, type: 'ProfilePage', mainEntity: ref(PERSON_ID) });
}

export function blogPostingNode(note: Note, stats: NoteStats): JsonLdNode {
  const url = absoluteUrl(noteHref(note));
  const { title, description, pubDate, updatedDate, tags, category } = note.data;
  return {
    '@type': 'BlogPosting',
    '@id': `${url}#article`,
    headline: title,
    description,
    url,
    mainEntityOfPage: url,
    datePublished: pubDate.toISOString(),
    dateModified: (updatedDate ?? pubDate).toISOString(),
    author: ref(PERSON_ID),
    publisher: ref(PERSON_ID),
    isPartOf: ref(BLOG_ID),
    inLanguage: SITE_CONFIG.language,
    articleSection: category,
    ...(tags.length > 0 ? { keywords: tags } : {}),
    wordCount: stats.words,
    timeRequired: `PT${stats.minutes}M`,
    image: absoluteUrl('/og-card.png'),
    ...(note.data.canonicalUrl ? { sameAs: note.data.canonicalUrl } : {}),
  };
}

/** The posts on `/threads`, listing every published note. */
export function blogNode(notes: readonly Note[]): JsonLdNode {
  return {
    '@type': 'Blog',
    '@id': BLOG_ID,
    url: absoluteUrl('/threads/'),
    name: `Threads · ${SITE_CONFIG.name}`,
    description: 'Essays and notes on cloud infrastructure, cost work, self-hosting, and rabbit holes.',
    inLanguage: SITE_CONFIG.language,
    author: ref(PERSON_ID),
    isPartOf: ref(WEBSITE_ID),
    blogPost: notes.map((note) => ({
      '@type': 'BlogPosting',
      '@id': `${absoluteUrl(noteHref(note))}#article`,
      headline: note.data.title,
      url: absoluteUrl(noteHref(note)),
      datePublished: note.data.pubDate.toISOString(),
    })),
  };
}

/** A `Book`, with Rajat's note on it as a `Review` (linked to its page on /reads). */
function bookItem(book: BookEntry): Record<string, unknown> {
  const { title, translatedTitle, author, year, language, category, notes } = book.data;
  const url = absoluteUrl(bookHref(book));
  return {
    '@type': 'Book',
    '@id': `${url}#book`,
    name: title,
    ...(translatedTitle ? { alternateName: translatedTitle } : {}),
    author: { '@type': 'Person', name: author },
    inLanguage: language.toLowerCase(),
    datePublished: String(year),
    genre: category,
    url,
    review: {
      '@type': 'Review',
      author: ref(PERSON_ID),
      reviewBody: notes,
      inLanguage: 'en',
      url,
    },
  };
}

/** One book, for its own page. */
export function bookNode(book: BookEntry): JsonLdNode {
  return bookItem(book) as JsonLdNode;
}

/** An `ItemList` of books, each with Rajat's note on it as a `Review`. */
export function bookListNode(books: readonly BookEntry[], path: string): JsonLdNode {
  return {
    '@type': 'ItemList',
    '@id': `${absoluteUrl(path)}#books`,
    name: 'Books Rajat Khirid is reading and has read',
    numberOfItems: books.length,
    itemListElement: books.map((book, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: bookItem(book),
    })),
  };
}
