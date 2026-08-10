import { z } from 'zod';

/**
 * Timeline content: a single chronological rail of notable moments, spanning
 * education, work, certifications, and personal milestones.
 *
 * This is deliberately separate from `experience.ts` (roles with achievement
 * bullets) and `achievements.ts` (standalone awards). The timeline is the
 * at-a-glance story; the other two are the detail.
 *
 * EDIT THIS FILE to add entries. Keep the most recent first.
 */

export const TimelineIcon = z.enum([
  'award',
  'briefcase',
  'graduation',
  'rocket',
  'code',
  'sparkle',
]);
export type TimelineIcon = z.infer<typeof TimelineIcon>;

export const TimelineEntry = z.object({
  /** Human-readable date label, e.g. "Aug 2023". */
  date: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1).max(400),
  icon: TimelineIcon.default('sparkle'),
});
export type TimelineEntry = z.infer<typeof TimelineEntry>;

export const Timeline = z.array(TimelineEntry).min(1);
export type Timeline = z.infer<typeof Timeline>;

export const timeline: Timeline = Timeline.parse([
  // TODO: extend with everything since 2023.
  {
    date: 'Aug 2023',
    title: 'AWS and Linux certified',
    description:
      'Earned the AWS Certified Cloud Practitioner credential and the Introduction to Linux certificate from The Linux Foundation.',
    icon: 'award',
  },
  {
    date: 'Jul 2023',
    title: 'Wrapped up seven months at Canspirit.ai',
    description:
      'Finished my DevOps internship, which also lined up with my first full year of running Linux as a daily driver.',
    icon: 'briefcase',
  },
  {
    date: 'Jun 2023',
    title: 'Graduated with a 9.33 CGPA',
    description: 'Finished my undergraduate degree with a 9.33 overall CGPA.',
    icon: 'graduation',
  },
  {
    date: 'Apr 2023',
    title: 'Completed the LTIMindTree cloud track',
    description:
      'Finished the cloud internship and training programme, clearing every milestone along the way.',
    icon: 'rocket',
  },
]);
