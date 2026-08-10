import { z } from 'zod';

/**
 * Skills content: grouped skill labels rendered as a badge cloud per category.
 *
 * Grouping (rather than one flat list) keeps a long skill inventory scannable.
 * EDIT THIS FILE to change categories or add skills. Labels must be unique
 * across the whole file so the badge cloud never shows a duplicate.
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
  // TODO: prune / extend these to match your real stack.
  {
    category: 'Cloud',
    items: ['AWS', 'Microsoft Azure', 'Google Cloud Platform'],
  },
  {
    category: 'Containers & Orchestration',
    items: ['Docker', 'Kubernetes', 'Google Kubernetes Engine', 'Helm'],
  },
  {
    category: 'CI/CD & IaC',
    items: ['GitHub Actions', 'Jenkins', 'Terraform', 'Ansible'],
  },
  {
    category: 'Languages',
    items: ['Python', 'Bash', 'JavaScript', 'TypeScript', 'SQL'],
  },
  {
    category: 'Observability',
    items: ['Prometheus', 'Grafana', 'AWS CloudWatch'],
  },
  {
    category: 'Tools & Platforms',
    items: ['Linux', 'Git', 'Nginx', 'React', 'Node.js'],
  },
]);

/** Flat list of every skill label, useful for counts and structured data. */
export const allSkills: readonly string[] = skillGroups.flatMap((g) => g.items);
