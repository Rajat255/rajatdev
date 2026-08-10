import { z } from 'zod';

/**
 * About content: the narrative intro plus a short "currently" list.
 *
 * EDIT THIS FILE to rewrite your bio. `paragraphs` renders in order; add or
 * remove entries freely.
 */

export const AboutSchema = z.object({
  /** Prose paragraphs, rendered in order. */
  paragraphs: z.array(z.string().min(1)).min(1),
  /** Short "what I'm up to right now" bullets. Optional. */
  currently: z.array(z.string().min(1)).default([]),
});
export type About = z.infer<typeof AboutSchema>;

export const about: About = AboutSchema.parse({
  paragraphs: [
    "I'm a Cloud and DevOps engineer in Pune, three years into scaling production workloads on AWS and Azure. I like taking messy, manual infrastructure and turning it into something reproducible, observable, and boring in the best possible way.",
    'Lately that has meant being the only DevOps engineer behind 50+ services, cutting an AWS bill nearly in half without anyone noticing a difference, and getting incident response down to minutes rather than afternoons. Day to day I live in Kubernetes, Terraform, CI/CD, and whatever dashboard is telling me something is wrong.',
    'Away from the terminal you will find me on a bicycle, behind a camera, or halfway down whichever rabbit hole I fell into that week.',
  ],
  currently: [
    'Running EKS, Karpenter, and KEDA in production at amber',
    'Self-hosting this site on a homelab server I built and maintain',
    'Building AI agents that triage CI/CD failures on their own',
    'Writing about cloud and DevOps on my blog',
    'Learning French, currently hovering around B1',
  ],
});
