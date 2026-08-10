import { z } from 'zod';

/**
 * Projects content: the project cards.
 *
 * EDIT THIS FILE to add projects. Cards render in the order given. Set
 * `featured: true` to pin a project to the top of the grid.
 *
 * The featured three are the production programmes from `resume/main.tex`, with
 * one earlier personal build after them. Work projects carry no links because
 * the repositories are private, and `image` is omitted so the card falls back to
 * its neutral placeholder rather than showing a stock diagram.
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
    title: 'ECS to EKS Migration',
    description:
      'Moved 50+ containerized and non-containerized services from ECS and EC2 onto EKS, with Karpenter provisioning On-Demand and Spot pools just in time and KEDA scaling on SQS queue depth. Cut over blue-green behind an ALB ingress with zero customer-facing downtime.',
    dates: '2026',
    tags: ['EKS', 'Kubernetes', 'Karpenter', 'KEDA', 'Terraform', 'Helm'],
    featured: true,
  },
  {
    title: 'AWS Cost Optimization Program',
    description:
      'A 2.5 month programme that took monthly AWS spend from $35–38K to $19–21K, about $200K a year. Re-architected the data tier onto Graviton, moved Redshift to RA3, shifted Fargate to Spot-backed EC2, consolidated 14 load balancers to 4, and layered Savings Plans once capacity was predictable.',
    dates: '2025',
    tags: ['FinOps', 'Aurora', 'Redshift', 'Graviton', 'Spot', 'Savings Plans'],
    featured: true,
  },
  {
    title: 'Agentic CI/CD Failure Triage',
    description:
      'A Kubernetes-native agent watching Jenkins and Argo Workflows across 30+ pipelines, using an LLM layer to classify failures by root cause. It posts Slack summaries with fixes, opens targeted pull requests, and retries transient failures over MCP, resolving 40% without a human.',
    dates: '2026',
    tags: ['Python', 'LLM Agents', 'MCP', 'Jenkins', 'Argo Workflows', 'Helm'],
    featured: true,
  },
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
