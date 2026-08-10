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
    // TODO: replace with your own bio.
    "I'm a Cloud and DevOps engineer based in Pune. I like taking messy, manual infrastructure and turning it into something reproducible, observable, and boring in the best possible way.",
    'Most of my time goes into containers, CI/CD pipelines, and the AWS ecosystem. Outside of that you will find me on a bicycle, behind a camera, or reading about whatever rabbit hole I fell into that week.',
  ],
  currently: [
    'Deepening Kubernetes and platform engineering skills',
    'Writing about cloud and DevOps on my blog',
    'Open to Cloud / DevOps engineering roles',
  ],
});
