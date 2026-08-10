import { z } from 'zod';

/**
 * Experience content: roles rendered as an expandable narrative timeline.
 *
 * EDIT THIS FILE to add roles. Entries render in the order given, so keep the
 * most recent first. Set `end: 'Present'` for a current role.
 */

export const ExperienceEntry = z.object({
  company: z.string().min(1),
  role: z.string().min(1),
  /** Human-readable start, e.g. "Jan 2023". */
  start: z.string().min(1),
  /** Human-readable end, or "Present". */
  end: z.string().min(1),
  /** Employment type, e.g. "Internship" / "Full-time". Optional. */
  kind: z.string().min(1).optional(),
  location: z.string().min(1).optional(),
  /** Path to a logo in `public/`. Falls back to the company initial. */
  logoUrl: z.string().min(1).optional(),
  /** Achievement bullets shown when the entry is expanded. */
  highlights: z.array(z.string().min(1)).min(1),
  /** Technologies used in the role. */
  tags: z.array(z.string().min(1)).default([]),
});
export type ExperienceEntry = z.infer<typeof ExperienceEntry>;

export const Experience = z.array(ExperienceEntry).min(1);
export type Experience = z.infer<typeof Experience>;

export const experience: Experience = Experience.parse([
  // TODO: replace with your real roles and achievements.
  {
    company: 'amber  ',
    role: 'DevOps Engineer SDE1',
    start: 'Jan 2025',
    end: 'Present',
    kind: 'Internship',
    location: 'Pune, India',
    logoUrl: '/images/logos/amber.svg',
    highlights: [
      'Completed a seven month DevOps internship working across CI/CD and cloud infrastructure.',
      'Containerized internal services and helped move deployments onto a reproducible pipeline.',
    ],
    tags: ['Docker', 'CI/CD', 'Linux', 'AWS'],
  },
  {
    company: 'IAMOPS  ',
    role: 'DevOps Engineer',
    start: 'Oct 2023',
    end: 'Dec 2024',
    kind: 'Internship',
    location: 'Pune, India',
    logoUrl: '/images/logos/iamops.svg',
    highlights: [
      'Completed a seven month DevOps internship working across CI/CD and cloud infrastructure.',
      'Containerized internal services and helped move deployments onto a reproducible pipeline.',
    ],
    tags: ['Docker', 'CI/CD', 'Linux', 'AWS'],
  },
  {
    company: 'LTM - Larsen&Toubro  ',
    role: 'Cloud Intern',
    start: 'Jul 2023',
    end: 'Sept 2023',
    kind: 'Internship',
    location: 'Pune',
    logoUrl: '/images/logos/ltimindtree.svg',
    highlights: [
      'Completed the cloud internship and training track, clearing every milestone assessment.',
      'Built hands-on labs across compute, storage, networking, and identity on AWS.',
    ],
    tags: ['AWS', 'Cloud Fundamentals'],
  },
]);

/** Count of distinct companies, used by the stat counters. */
export const companyCount = new Set(experience.map((e) => e.company)).size;
