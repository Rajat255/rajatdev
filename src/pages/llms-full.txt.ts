import type { APIRoute } from 'astro';

import { buildLlmsFullTxt } from '../lib/llms';
import { getPublishedNotes } from '../lib/notes';

/**
 * /llms-full.txt — the whole site as one Markdown document (bio, work, case
 * studies, books, timeline, and the full text of every note), so an LLM can
 * read everything in one request. Prerendered at build time.
 */
export const GET: APIRoute = async () =>
  new Response(buildLlmsFullTxt(await getPublishedNotes()), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
