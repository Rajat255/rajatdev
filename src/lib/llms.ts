/**
 * Plain-text renderings of the site for LLMs and other machine readers:
 *
 *   /llms.txt          an index in the llms.txt format (https://llmstxt.org)
 *   /llms-full.txt     everything on the site in one Markdown document
 *   /threads/<slug>.md each post's raw Markdown with metadata
 *
 * All three are built from the same data modules and content collection as the
 * HTML pages, so they cannot drift from what a visitor reads.
 */
import { SITE_CONFIG, absoluteUrl, showcaseIsPublic } from '../config/site';
import { SHELF_ORDER, SHELF_TITLES, bookHref, booksByStatus, hasWriting, type BookEntry } from './books';
import { caseFilesFor } from '../data/caseFiles';
import { certifications } from '../data/certifications';
import { experience } from '../data/experience';
import { profile } from '../data/profile';
import { orderedProjects } from '../data/projects';
import { skillGroups } from '../data/skills';
import { stats } from '../data/stats';
import { rabbitHoles } from '../data/threads';
import { toIsoDate } from './format';
import { noteHref, noteMarkdownHref, noteStats, type Note } from './notes';
import { displayStat } from './stats';

const TITLE = `${profile.name} — ${profile.role} (${new URL(SITE_CONFIG.url).host})`;

/** JSON strings are valid YAML double-quoted scalars, so this escapes safely. */
const yaml = (value: string): string => JSON.stringify(value);

/** A note's Markdown with its metadata as YAML frontmatter. */
export function noteToMarkdown(note: Note): string {
  const { title, description, pubDate, updatedDate, tags, category, canonicalUrl } = note.data;
  const { words, minutes } = noteStats(note);
  const url = absoluteUrl(noteHref(note));

  const frontmatter = [
    '---',
    `title: ${yaml(title)}`,
    `description: ${yaml(description)}`,
    `author: ${yaml(profile.name)}`,
    `published: ${toIsoDate(pubDate)}`,
    ...(updatedDate ? [`updated: ${toIsoDate(updatedDate)}`] : []),
    `category: ${yaml(category)}`,
    `tags: [${tags.map(yaml).join(', ')}]`,
    `url: ${yaml(url)}`,
    `canonical: ${yaml(canonicalUrl ?? url)}`,
    `word_count: ${words}`,
    `reading_time_minutes: ${minutes}`,
    '---',
  ];

  return `${frontmatter.join('\n')}\n\n# ${title}\n\n${note.body.trim()}\n`;
}

/**
 * Demotes ATX headings by `levels` (capped at h6), so a document can be nested
 * under a heading of its own. Lines inside fenced code blocks are left alone,
 * so shell or YAML comments starting with `#` survive.
 */
export function shiftHeadings(markdown: string, levels: number): string {
  let fence: string | null = null;
  return markdown
    .split('\n')
    .map((line) => {
      const marker = /^(```|~~~)/.exec(line)?.[1];
      if (marker) {
        fence = fence === null ? marker : fence === marker ? null : fence;
        return line;
      }
      if (fence !== null) return line;
      return line.replace(/^(#{1,6})(\s)/, (_, hashes: string, space: string) =>
        `${'#'.repeat(Math.min(6, hashes.length + levels))}${space}`,
      );
    })
    .join('\n');
}

/** The pages worth reading, with one line on each. */
function pageLinks(): string[] {
  return [
    `- [Builds](${absoluteUrl('/builds/')}): Certifications, cloud engineering at amber and IAMOPS, case studies (an ECS to EKS migration, a $200K/yr AWS cost programme, agentic CI/CD triage), and side projects including plot-it.fun.`,
    `- [The triage agent](${absoluteUrl('/builds/triage-agent/')}): A simulator of the CI/CD triage agent from the case studies.`,
    `- [The homelab](${absoluteUrl('/builds/homelab/')}): The bare-metal box at home that serves this site, and the path a request takes to reach it.`,
    `- [Threads](${absoluteUrl('/threads/')}): Every post, newest first, plus the rabbit holes he is in.`,
    `- [Reads](${absoluteUrl('/reads/')}): Books he is reading and has read, with a note on each and a page per book.`,
    `- [Now](${absoluteUrl('/now/')}): What he is focused on at the moment.`,
    `- [About](${absoluteUrl('/about/')}): A longer introduction.`,
    `- [Colophon](${absoluteUrl('/colophon/')}): How this site is built and hosted, and its feeds.`,
    ...(showcaseIsPublic()
      ? [`- [Showcase](${absoluteUrl('/showcase/')}): Independent web projects and experiments.`]
      : []),
  ];
}

/** /llms.txt: a short index of the site, in the llms.txt format. */
export function buildLlmsTxt(notes: readonly Note[], books: readonly BookEntry[]): string {
  const lines = [
    `# ${TITLE}`,
    '',
    `> ${profile.summary}`,
    '',
    `This is the personal site of ${profile.name}: things he has built, posts he has written, and books he has read. Every post is also available as raw Markdown by adding \`.md\` to its URL, and the whole site is available as one document at ${absoluteUrl('/llms-full.txt')}.`,
    '',
    '## Pages',
    '',
    ...pageLinks(),
    '',
    '## Posts',
    '',
    ...(notes.length === 0
      ? ['- No posts published yet.']
      : notes.map(
          (note) =>
            `- [${note.data.title}](${absoluteUrl(noteHref(note))}): ${note.data.description} Published ${toIsoDate(note.data.pubDate)}. Markdown: ${absoluteUrl(noteMarkdownHref(note))}`,
        )),
    '',
    '## Books',
    '',
    ...(books.length === 0
      ? ['- No books listed yet.']
      : books.map(
          (book) =>
            `- [${book.data.title}, by ${book.data.author}](${absoluteUrl(bookHref(book))}): ${SHELF_TITLES[book.data.status]}. ${book.data.notes}`,
        )),
    '',
    '## Feeds',
    '',
    `- [RSS](${absoluteUrl('/rss.xml')}): Full text of every note.`,
    `- [Sitemap](${absoluteUrl('/sitemap-index.xml')})`,
    '',
    '## Optional',
    '',
    `- [Full text for LLMs](${absoluteUrl('/llms-full.txt')}): The bio, work history, case studies, books, and every post in one Markdown file.`,
    `- [Résumé (PDF)](${absoluteUrl(SITE_CONFIG.contact.resume)})`,
    `- [GitHub](${SITE_CONFIG.contact.github})`,
    `- [LinkedIn](${SITE_CONFIG.contact.linkedin})`,
    `- Email: ${SITE_CONFIG.contact.email}`,
    '',
  ];
  return lines.join('\n');
}

/** /llms-full.txt: the whole site as one Markdown document. */
export function buildLlmsFullTxt(notes: readonly Note[], books: readonly BookEntry[]): string {
  const out: string[] = [];
  const push = (...lines: string[]) => out.push(...lines);

  push(`# ${TITLE}`, '', `> ${profile.summary}`, '');
  push(
    `Source: ${absoluteUrl('/')}. Generated from the same data as the site at build time, ${toIsoDate(new Date())}.`,
    '',
  );

  push('## About', '', profile.description, '');
  push(`- Location: ${profile.location}`);
  push(`- Email: ${profile.email}`);
  for (const social of profile.socials.filter((s) => /^https?:\/\//.test(s.url))) {
    push(`- ${social.name}: ${social.url}`);
  }
  push(`- Résumé: ${absoluteUrl(profile.resumeUrl)}`, '');

  push('## Headline figures', '');
  for (const stat of stats) push(`- ${displayStat(stat)}: ${stat.label}`);
  push('');

  push('## Work', '');
  for (const role of experience) {
    push(`### ${role.company} — ${role.role} (${role.start} – ${role.end})`, '');
    for (const highlight of role.highlights) push(`- ${highlight}`);
    if (role.tags.length > 0) push('', `Tools: ${role.tags.join(', ')}`);
    push('');

    for (const file of caseFilesFor(role.company)) {
      push(`#### Case study: ${file.title} (${file.year})`, '', file.summary, '');
      push('Before:', '', file.before, '');
      push('What changed:', '');
      for (const change of file.changes) push(`- ${change}`);
      push('', 'Numbers:', '');
      for (const metric of file.metrics) push(`- ${metric.value}: ${metric.label}`);
      push('', `Stack: ${file.stack.join(', ')}`, '');
    }
  }

  push('## Side projects', '');
  for (const project of orderedProjects) {
    push(`### ${project.title} (${project.dates})`, '', project.description, '');
    if (project.tags.length > 0) push(`Tags: ${project.tags.join(', ')}`);
    for (const link of project.links) push(`Link: ${link.href}`);
    push('');
  }

  push('## Certifications', '');
  for (const cert of certifications) {
    push(`- ${cert.name}, ${cert.issuer}${cert.date ? `, ${cert.date}` : ''}${cert.verifyUrl ? `. Verify: ${cert.verifyUrl}` : ''}`);
  }
  push('');

  push('## Skills', '');
  for (const group of skillGroups) push(`- ${group.category}: ${group.items.join(', ')}`);
  push('');

  push('## Books', '');
  for (const status of SHELF_ORDER) {
    const shelf = booksByStatus(books, status);
    if (shelf.length === 0) continue;
    push(`### ${SHELF_TITLES[status]}`, '');
    for (const book of shelf) {
      const { title, translatedTitle, author, year, category, notes } = book.data;
      const name = translatedTitle ? `${title} (${translatedTitle})` : title;
      push(`#### ${name}, by ${author} (${year})`, '');
      push(`${category}. Page: ${absoluteUrl(bookHref(book))}`, '');
      push(`> ${notes}`, '');
      // His longer writing on the book, nested under its heading.
      if (hasWriting(book)) push(shiftHeadings(book.body.replace(/<!--[\s\S]*?-->/g, '').trim(), 4), '');
    }
    push('');
  }

  push('## Rabbit holes', '');
  for (const hole of rabbitHoles) push(`- ${hole.title}: ${hole.note}`);
  push('');

  push('## Posts', '');
  if (notes.length === 0) push('No posts published yet.', '');
  for (const note of notes) {
    const { words } = noteStats(note);
    push(`### ${note.data.title}`, '');
    push(
      `Published ${toIsoDate(note.data.pubDate)}${note.data.updatedDate ? `, updated ${toIsoDate(note.data.updatedDate)}` : ''}. ${note.data.category}. ${words} words. URL: ${absoluteUrl(noteHref(note))}`,
      '',
      `> ${note.data.description}`,
      '',
      // The note's own `##` headings sit under its `###` title here.
      shiftHeadings(note.body.trim(), 2),
      '',
    );
  }

  return `${out.join('\n').replace(/\n{3,}/g, '\n\n').trim()}\n`;
}
