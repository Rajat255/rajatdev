import { z } from 'zod';

/**
 * Achievements content: awards, hackathons, talks, publications, and anything
 * else worth calling out that isn't a job, project, or certification.
 *
 * EDIT THIS FILE to add achievements. `icon` picks one of a small set of inline
 * glyphs rendered by AchievementsSection.
 */

export const AchievementIcon = z.enum([
  'award',
  'trophy',
  'star',
  'graduation',
  'mic',
  'pen',
]);
export type AchievementIcon = z.infer<typeof AchievementIcon>;

export const Achievement = z.object({
  title: z.string().min(1),
  /** Awarding body, event, or publication. */
  issuer: z.string().min(1).optional(),
  /** Human-readable date, e.g. "Jun 2023". */
  date: z.string().min(1),
  description: z.string().min(1).max(300).optional(),
  icon: AchievementIcon.default('award'),
  /** Optional link to proof, writeup, or announcement. */
  href: z.string().url().optional(),
});
export type Achievement = z.infer<typeof Achievement>;

export const Achievements = z.array(Achievement).min(1);
export type Achievements = z.infer<typeof Achievements>;

export const achievements: Achievements = Achievements.parse([
  // TODO: replace with your real achievements.
  {
    title: 'Graduated with a 9.33 CGPA',
    issuer: 'Savitribai Phule Pune University',
    date: 'Jun 2023',
    description:
      'Finished my undergraduate degree with a 9.33 overall CGPA across all semesters.',
    icon: 'graduation',
  },
  {
    title: 'Cleared every milestone in the LTIMindTree cloud track',
    issuer: 'LTIMindTree',
    date: 'Apr 2023',
    description:
      'Completed the full cloud internship and training programme with all milestone assessments passed.',
    icon: 'trophy',
  },
  {
    title: 'Writing about cloud and DevOps',
    issuer: 'Hashnode',
    date: 'Ongoing',
    description:
      'Publishing notes and walkthroughs on the things I break and then fix in the cloud.',
    icon: 'pen',
    href: 'https://rajats.hashnode.dev/',
  },
]);
