import { z } from 'zod';

/**
 * Projects content: the project cards.
 *
 * EDIT THIS FILE to add projects. Cards render in the order given. Set
 * `featured: true` to pin a project to the top of the grid.
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
    featured: true,
  },
  {
    title: 'Dockerize',
    description:
      'Containerized my personal website with Docker and hosted it on Google Kubernetes Engine across multiple nodes, making it fully cloud dependent and automatically load balanced.',
    dates: '2023',
    tags: ['Docker', 'Kubernetes', 'GCP', 'GKE'],
    links: [{ type: 'github', href: 'https://github.com/Rajat255/DockerFiles' }],
    image: '/images/projects/docker.png',
    featured: true,
  },
  {
    title: 'Tyr',
    description:
      'A smart water monitoring system that uses IoT sensors to collect water usage and quality data, with the ability to remotely shut off any water outlet from a computer.',
    dates: '2022',
    tags: ['IoT', 'Embedded', 'Python'],
    links: [{ type: 'github', href: 'https://github.com/Rajat255?tab=repositories' }],
    image: '/images/projects/water.png',
  },
  // TODO: add the rest of your projects here.
]);

/** Featured projects first, then the rest, preserving authored order within each. */
export const orderedProjects: Projects = [
  ...projects.filter((p) => p.featured),
  ...projects.filter((p) => !p.featured),
];
