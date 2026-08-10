import { z } from 'zod';

/**
 * Skills content: grouped skill labels rendered as a badge cloud per category.
 *
 * Grouping (rather than one flat list) keeps a long skill inventory scannable.
 * EDIT THIS FILE to change categories or add skills. Labels must be unique
 * across the whole file so the badge cloud never shows a duplicate.
 *
 * Mirrors the skills block in `resume/main.tex`, with the resume's overlaps
 * resolved: each tool is listed under one category only (Helm under containers,
 * EKS under containers, and so on).
 */

export const SkillGroup = z.object({
  category: z.string().min(1),
  items: z.array(z.string().min(1)).min(1),
});
export type SkillGroup = z.infer<typeof SkillGroup>;

export const SkillGroups = z
  .array(SkillGroup)
  .min(1)
  .refine(
    (groups) => new Set(groups.map((g) => g.category)).size === groups.length,
    'skill categories must be unique',
  )
  .refine((groups) => {
    const all = groups.flatMap((g) => g.items);
    return new Set(all).size === all.length;
  }, 'skill labels must be unique across all categories');
export type SkillGroups = z.infer<typeof SkillGroups>;

export const skillGroups: SkillGroups = SkillGroups.parse([
  {
    category: 'Cloud',
    items: ['AWS', 'Microsoft Azure', 'Google Cloud Platform'],
  },
  {
    category: 'Containers & Orchestration',
    items: ['Docker', 'Kubernetes', 'Amazon EKS', 'ECS', 'Karpenter', 'KEDA', 'Helm'],
  },
  {
    category: 'Infrastructure as Code',
    items: ['Terraform', 'AWS CloudFormation'],
  },
  {
    category: 'CI/CD & GitOps',
    items: [
      'ArgoCD',
      'Argo Workflows',
      'Jenkins',
      'GitHub Actions',
      'AWS CodePipeline',
      'Git',
    ],
  },
  {
    category: 'Compute & Serverless',
    items: ['EC2', 'AWS Lambda', 'Step Functions', 'API Gateway', 'Graviton', 'Spot'],
  },
  {
    category: 'Data & Storage',
    items: ['Aurora', 'RDS', 'Redshift', 'Valkey', 'S3', 'EFS', 'SQS', 'Athena'],
  },
  {
    category: 'Networking',
    items: ['Route 53', 'CloudFront', 'Application Load Balancers', 'VPC', 'ACM / TLS'],
  },
  {
    category: 'Observability',
    items: ['Prometheus', 'Grafana', 'New Relic', 'AWS CloudWatch'],
  },
  {
    category: 'Languages',
    items: ['Python', 'Bash', 'JavaScript', 'SQL', 'Linux'],
  },
  {
    category: 'Practices',
    items: [
      'Site Reliability Engineering',
      'Incident Management',
      'Root Cause Analysis',
      'FinOps & Cost Optimization',
      'Capacity Planning',
    ],
  },
]);

/** Flat list of every skill label, useful for counts and structured data. */
export const allSkills: readonly string[] = skillGroups.flatMap((g) => g.items);
