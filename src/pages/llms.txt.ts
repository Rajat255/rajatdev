import type { APIRoute } from 'astro';

import { buildLlmsTxt } from '../lib/llms';
import { getBooks } from '../lib/books';
import { getPublishedNotes } from '../lib/notes';

/**
 * /llms.txt — an index of the site for LLMs, in the llms.txt format
 * (https://llmstxt.org). Prerendered at build time from the site's data.
 */
export const GET: APIRoute = async () =>
  new Response(buildLlmsTxt(await getPublishedNotes(), await getBooks()), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
