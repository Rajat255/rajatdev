import type { APIRoute, GetStaticPaths } from 'astro';

import { noteToMarkdown } from '../../lib/llms';
import { getPublishedNotes, type Note } from '../../lib/notes';

/**
 * /notes/<slug>.md — the raw Markdown of each note, with its metadata as YAML
 * frontmatter, for readers and LLMs that prefer the source to the HTML.
 *
 * Prerendered to `dist/notes/<slug>.md`. A static host picks the Content-Type
 * from the file extension, so the server must map `.md` to
 * `text/markdown; charset=utf-8` (the header below applies in `astro dev`).
 */

export const getStaticPaths = (async () => {
  const notes = await getPublishedNotes();
  return notes.map((note) => ({ params: { slug: note.slug }, props: { note } }));
}) satisfies GetStaticPaths;

export const GET: APIRoute<{ note: Note }> = ({ props }) =>
  new Response(noteToMarkdown(props.note), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
