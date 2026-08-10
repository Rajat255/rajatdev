import { z } from 'zod';

/**
 * Timeline content: a single chronological rail of notable moments, spanning
 * education, work, certifications, and personal milestones.
 *
 * This is deliberately separate from `experience.ts` (roles with achievement
 * bullets) and `achievements.ts` (standalone awards). The timeline is the
 * at-a-glance story; the other two are the detail. Kept deliberately short —
 * one line per moment, no more than a handful of entries per year.
 *
 * EDIT THIS FILE to add entries. Keep the most recent first.
 */

export const TimelineIcon = z.enum([
  'award',
  'briefcase',
  'graduation',
  'rocket',
  'code',
  'pin',
  'sparkle',
]);
export type TimelineIcon = z.infer<typeof TimelineIcon>;

export const TimelineEntry = z.object({
  /** Human-readable date label, e.g. "Aug 2023". */
  date: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1).max(400),
  icon: TimelineIcon.default('sparkle'),
  /**
   * An optional aside with a lighter tone than `description` — the joke, the
   * detail that did not fit the resume, the part that was actually memorable.
   * Rendered as a smaller accented line under the body. Keep it to one breath.
   */
  flair: z.string().min(1).max(140).optional(),
});
export type TimelineEntry = z.infer<typeof TimelineEntry>;

export const Timeline = z.array(TimelineEntry).min(1);
export type Timeline = z.infer<typeof Timeline>;

export const timeline: Timeline = Timeline.parse([
  {
    date: 'Jul 2026',
    title: 'AWS Solutions Architect – Professional',
    description: 'Cleared SAP-C02, the one I had been circling for a while.',
    icon: 'award',
    flair: 'Three hours, 75 questions, and an unreasonable number of VPC diagrams.',
  },
  {
    date: '2026',
    title: 'Taught a robot to read build logs',
    description:
      'Shipped an agent that watches 30+ pipelines, classifies failures by root cause, and opens the fix as a pull request.',
    icon: 'rocket',
    flair: '40% of broken builds now sort themselves out before anyone notices.',
  },
  {
    date: '2025',
    title: 'Halved the AWS bill',
    description:
      'Ran a company-wide cost programme that took monthly spend from $35–38K to $19–21K with no drop in availability.',
    icon: 'award',
    flair: 'Fourteen load balancers became four. Nobody noticed, which was the whole point.',
  },
  {
    date: 'Dec 2024',
    title: 'Became amber’s DevOps team',
    description:
      'Joined as SDE1 and spent eight months as the only DevOps engineer, owning production for 50+ services.',
    icon: 'briefcase',
    flair: 'One pager rotation, no co-pilot, a lot of respect for good runbooks.',
  },
  {
    // TODO: confirm the year of the ride and move this entry if it needs to sit
    // elsewhere on the rail.
    date: '2024',
    title: 'Bought my first motorbike, then rode it to Goa',
    description:
      'Took it down the entire Konkan coast to Goa and back, a little over 1,500 km of ghat sections, coastal highway, and questionable roadside food.',
    icon: 'pin',
    flair: 'Best infrastructure decision I have ever made without a Terraform plan.',
  },
  {
    date: 'Oct 2023',
    title: 'Started at IAMOPS',
    description:
      'Consulting across four client accounts on Azure-to-AWS migrations, Terraform, and SRE practice.',
    icon: 'briefcase',
  },
  {
    date: 'Aug 2023',
    title: 'First AWS certification',
    description: 'Earned the AWS Certified Cloud Practitioner credential.',
    icon: 'award',
    flair: 'The gateway drug.',
  },
  {
    date: 'Jun 2023',
    title: 'Graduated with a 9.33 CGPA',
    description:
      'Finished a Computer Science degree at Savitribai Phule Pune University with honors in Artificial Intelligence.',
    icon: 'graduation',
  },
  {
    date: '2022',
    title: 'Switched to Linux full-time',
    description:
      'Made Linux the daily driver and never went back, which is how most of this started.',
    icon: 'code',
    flair: 'Reinstalled exactly once, and that time it was on purpose.',
  },
]);
