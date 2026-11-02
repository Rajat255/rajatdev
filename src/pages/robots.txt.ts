import type { APIRoute } from 'astro';

import { absoluteUrl, showcaseIsPublic } from '../config/site';

/**
 * /robots.txt — welcomes search engines and AI crawlers, and points them at the
 * sitemap and llms.txt.
 *
 * Generated rather than kept in `public/` so the `/showcase` rule follows
 * `SITE_CONFIG.showShowcaseInNav`: disallowed while the page is unlisted,
 * allowed once it is published.
 *
 * Each crawler is given its own group because a crawler obeys only the most
 * specific group that names it, ignoring `*`.
 */
const AGENTS = [
  '*',
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-SearchBot',
  'Claude-User',
  'anthropic-ai',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',
  'Applebot-Extended',
];

export const GET: APIRoute = () => {
  const disallow = showcaseIsPublic() ? [] : ['Disallow: /showcase'];
  const groups = AGENTS.map((agent) => [`User-agent: ${agent}`, 'Allow: /', ...disallow].join('\n'));

  const body = [
    '# Search engines and AI crawlers are welcome here.',
    `# A plain-text guide to this site for LLMs: ${absoluteUrl('/llms.txt')}`,
    '',
    groups.join('\n\n'),
    '',
    `Sitemap: ${absoluteUrl('/sitemap-index.xml')}`,
    '',
  ].join('\n');

  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
