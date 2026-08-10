import { z } from 'zod';

/**
 * Experience content: roles rendered as an expandable narrative timeline.
 *
 * EDIT THIS FILE to add roles. Entries render in the order given, so keep the
 * most recent first. Set `end: 'Present'` for a current role.
 *
 * Source of truth for the copy here is `resume/main.tex`. Bullets are a trimmed
 * subset of the resume's: the card expands to show them, so the aim is the four
 * or five that carry the most weight, not the full list.
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
  {
    company: 'amber',
    role: 'DevOps Engineer, SDE1',
    start: 'Dec 2024',
    end: 'Present',
    kind: 'Full-time',
    location: 'Pune, India',
    logoUrl: '/images/logos/amber.jpeg',
    highlights: [
      'Sole DevOps engineer for 8+ months, owning production AWS infrastructure for 50+ services and 50,000+ monthly active users across global environments.',
      'Led a company-wide cost programme that cut monthly AWS spend 45% (roughly $200K/year) through Graviton and Spot adoption, an Aurora and Redshift re-architecture, Savings Plans, and load balancer consolidation, with no hit to availability.',
      'Run EKS workloads through Helm and ArgoCD with autoscaling and resource tuning, lifting cluster utilization by 24%.',
      'Built CI/CD in Argo Workflows, Jenkins, and GitHub Actions, moving deployments from a few a week to several a day.',
      'Codified infrastructure with Terraform across 4 AWS accounts using reusable modules and remote state, eliminating configuration drift.',
      'Held production to 3–4 incidents, each detected and resolved inside 5 minutes, backed by SLO alerting in Grafana, Prometheus, and CloudWatch plus blameless post-mortems.',
    ],
    tags: ['AWS', 'EKS', 'Terraform', 'ArgoCD', 'Karpenter', 'Grafana', 'FinOps'],
  },
  {
    company: 'IAMOPS',
    role: 'DevOps Engineer',
    start: 'Oct 2023',
    end: 'Dec 2024',
    kind: 'Full-time',
    location: 'Pune, India',
    logoUrl: '/images/logos/iamops.svg',
    highlights: [
      'Architected Azure-to-AWS migrations on CloudFront, ECS, and RDS against Well-Architected practices, delivering $54K/year in savings across client workloads.',
      'Owned weekly engagements across 4 client accounts, presenting migration roadmaps and solution designs.',
      'Shipped parallelized multi-environment CI/CD with Jenkins, CodePipeline, and EC2 user data, cutting environment setup from 2.5 hours to 40 minutes.',
      'Automated event-driven workflows with Lambda, API Gateway, and Step Functions, trimming recurring spend 25% and removing 10+ hours a week of manual toil.',
      'Covered SRE duties end to end: on-call rotations, RCA, runbooks, and instrumentation in CloudWatch, Grafana, and New Relic.',
    ],
    tags: ['AWS', 'Terraform', 'Jenkins', 'Lambda', 'ECS', 'New Relic'],
  },
  {
    company: 'LTIMindtree',
    role: 'Cloud Intern',
    start: 'Jul 2023',
    end: 'Sept 2023',
    kind: 'Internship',
    location: 'Pune, India',
    logoUrl: '/images/logos/ltimindtree.svg',
    highlights: [
      'Cleared every milestone assessment in the cloud internship and training track.',
      'Built hands-on labs across compute, storage, networking, and identity on AWS.',
    ],
    tags: ['AWS', 'Cloud Fundamentals'],
  },
]);

/** Count of distinct companies, used by the stat counters. */
export const companyCount = new Set(experience.map((e) => e.company)).size;
