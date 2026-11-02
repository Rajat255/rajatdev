import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx,md,mdx}'],
  // Theme switching keys off a `.dark` / `.light` class on <html>, set by the
  // no-flash script in BaseLayout.astro. Light is the default.
  darkMode: 'class',
  theme: {
    screens: {
      xs: '360px',
      sm: '480px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
    extend: {
      // Self-hosted via Fontsource (see the @import block in src/styles/global.css).
      // EB Garamond sets everything; Geist Mono is kept for code and the
      // terminal on the builds page. `font-sans` is left as Tailwind's system UI
      // stack, used only for the top navigation (no web font, so nothing swaps).
      fontFamily: {
        // The "Fallback" families are system serifs resized to EB Garamond's
        // proportions (see global.css), so the swap when the web font arrives
        // doesn't make text jump.
        serif: [
          '"EB Garamond Variable"',
          '"EB Garamond Fallback Georgia"',
          '"EB Garamond Fallback Times"',
          '"EB Garamond Fallback Noto"',
          'Georgia',
          'serif',
        ],
        mono: ['"Geist Mono Variable"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      // Backed by the CSS custom properties in src/styles/global.css, stored as
      // RGB channels so `<alpha-value>` makes utilities like `border-ink/60` work.
      colors: {
        paper: 'rgb(var(--paper) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        ink: 'rgb(var(--ink) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        accent: 'rgb(var(--accent) / <alpha-value>)',
        rule: 'rgb(var(--rule) / <alpha-value>)',
      },
      maxWidth: {
        // The front page column, and the slightly wider column for inner pages.
        column: '600px',
        page: '620px',
      },
      typography: {
        // `prose-stone`, recoloured from the site's own tokens (this merges over
        // the plugin's stone palette), so essays sit on warm newsprint and
        // follow the theme toggle without a separate dark variant.
        stone: {
          css: {
            '--tw-prose-body': 'rgb(var(--ink))',
            '--tw-prose-headings': 'rgb(var(--ink))',
            '--tw-prose-lead': 'rgb(var(--muted))',
            '--tw-prose-links': 'rgb(var(--ink))',
            '--tw-prose-bold': 'rgb(var(--ink))',
            '--tw-prose-counters': 'rgb(var(--muted))',
            '--tw-prose-bullets': 'rgb(var(--accent))',
            '--tw-prose-hr': 'rgb(var(--rule))',
            '--tw-prose-quotes': 'rgb(var(--ink))',
            '--tw-prose-quote-borders': 'rgb(var(--accent))',
            '--tw-prose-captions': 'rgb(var(--muted))',
            '--tw-prose-code': 'rgb(var(--ink))',
            '--tw-prose-pre-code': 'rgb(var(--ink))',
            '--tw-prose-pre-bg': 'rgb(var(--surface))',
            '--tw-prose-th-borders': 'rgb(var(--rule))',
            '--tw-prose-td-borders': 'rgb(var(--rule))',
          },
        },
        DEFAULT: {
          css: {
            a: {
              fontWeight: 'inherit',
              textDecorationThickness: '1px',
              textUnderlineOffset: '0.2em',
              textDecorationColor: 'rgb(var(--ink) / 0.4)',
              '&:hover': {
                color: 'rgb(var(--accent))',
                textDecorationColor: 'rgb(var(--accent))',
              },
            },
            strong: { fontWeight: '600' },
            h2: { fontWeight: '600', letterSpacing: '0.01em' },
            h3: { fontWeight: '500', fontStyle: 'italic' },
            blockquote: { fontWeight: '400', borderInlineStartWidth: '2px' },
            'blockquote p:first-of-type::before': { content: 'none' },
            'blockquote p:last-of-type::after': { content: 'none' },
            code: { fontWeight: '400', fontSize: '0.8em' },
            'code::before': { content: 'none' },
            'code::after': { content: 'none' },
            pre: { borderRadius: '0', border: '1px solid rgb(var(--rule))', fontSize: '0.78em' },
            hr: { borderTopWidth: '0', textAlign: 'center', marginTop: '2.5em', marginBottom: '2.5em' },
            'hr::after': {
              content: '"*\u2003*\u2003*"',
              color: 'rgb(var(--accent))',
            },
          },
        },
      },
    },
  },
  future: {
    hoverOnlyWhenSupported: true,
  },
  plugins: [typography],
};
