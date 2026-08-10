import { z } from 'zod';

/**
 * Navigation targets.
 *
 * `SectionId` is the single source of truth for which sections exist. Adding a
 * section means adding its id here, adding a nav target below, and rendering a
 * matching `<section id="...">` in `src/pages/index.astro`. A unit test asserts
 * every id in this enum is present in the rendered page, so the three can never
 * drift apart silently.
 */
export const SectionId = z.enum([
  'about',
  'skills',
  'experience',
  'projects',
  'certifications',
  // 'achievements' is hidden for now. The content and its section component are
  // still in the repo; re-enable by restoring this id and un-commenting the
  // matching <section> in `src/pages/index.astro`.
  'timeline',
  'contact',
]);
export type SectionId = z.infer<typeof SectionId>;

/** A single navigation target: the section it activates plus its display label. */
export const NavTarget = z.object({
  sectionId: SectionId,
  label: z.string().min(1),
});
export type NavTarget = z.infer<typeof NavTarget>;

/** A non-empty list of nav targets with distinct section ids. */
export const NavTargets = z
  .array(NavTarget)
  .min(1)
  .refine(
    (n) => new Set(n.map((t) => t.sectionId)).size === n.length,
    'each navigation target must reference a distinct section',
  );
export type NavTargets = z.infer<typeof NavTargets>;

/**
 * Targets surfaced in the floating dock. Kept to a small set so the dock stays
 * compact; the remaining sections are reachable by scrolling.
 */
export const navTargets: NavTargets = NavTargets.parse([
  { sectionId: 'about', label: 'About' },
  { sectionId: 'experience', label: 'Experience' },
  { sectionId: 'projects', label: 'Projects' },
  { sectionId: 'contact', label: 'Contact' },
]);

/** Every section id, in the order they appear on the page. */
export const allSectionIds: readonly SectionId[] = SectionId.options;
