import { z } from 'zod';

/**
 * Projects content: side projects, listed under "On the side" on the systems
 * page.
 *
 * EDIT THIS FILE to add personal projects. Entries render in the order given.
 * Set `featured: true` to pin one to the top.
 *
 * Work programmes (the EKS migration, the cost programme, the triage agent) are
 * not listed here: they are told once, in full, as case files nested under the
 * employer that ran them. See `src/data/caseFiles.ts`.
 */

/** The kind of external link attached to a project. */
export const ProjectLinkType = z.enum(['github', 'website', 'demo', 'article', 'other']);
export type ProjectLinkType = z.infer<typeof ProjectLinkType>;

export const ProjectLink = z.object({
  type: ProjectLinkType,
  href: z.string().min(1),
  /** Overrides the default label derived from `type`. */
  label: z.string().min(1).optional(),
});
export type ProjectLink = z.infer<typeof ProjectLink>;

export const Project = z.object({
  title: z.string().min(1),
  /** Bounded so cards stay readable and evenly sized. */
  description: z.string().min(20).max(400),
  /** Human-readable period or year. */
  dates: z.string().min(1),
  tags: z.array(z.string().min(1)).default([]),
  links: z.array(ProjectLink).default([]),
  /** Path to an image in `public/`. A gradient placeholder is used when absent. */
  image: z.string().min(1).optional(),
  featured: z.boolean().default(false),
});
export type Project = z.infer<typeof Project>;

export const Projects = z
  .array(Project)
  .min(1)
  .refine(
    (p) => new Set(p.map((x) => x.title)).size === p.length,
    'project titles must be unique',
  );
export type Projects = z.infer<typeof Projects>;

export const projects: Projects = Projects.parse([
  {
    title: 'GeekFixx',
    description:
      'A wellness application that looks after you while you use your computer. It uses machine learning to correct your posture and nudges you to look away from the screen, drink water, and take breaks.',
    dates: '2023',
    tags: ['React', 'Machine Learning', 'Python'],
    links: [{ type: 'github', href: 'https://github.com/Rajat255/GeekFixx-ReactApp' }],
    image: '/images/projects/geekfixx.png',
  },
]);

/** Featured projects first, then the rest, preserving authored order within each. */
export const orderedProjects: Projects = [
  ...projects.filter((p) => p.featured),
  ...projects.filter((p) => !p.featured),
];
