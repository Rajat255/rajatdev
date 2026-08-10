import { z } from 'zod';

/**
 * Certifications content: badge cards linking to their public verification page.
 *
 * EDIT THIS FILE to add certifications. Unlike the rest of the content layer,
 * `verifyUrl` is optional so an unverified or in-progress certification can be
 * listed without a dead link.
 */

export const Certification = z.object({
  name: z.string().min(1),
  issuer: z.string().min(1),
  /**
   * Human-readable award date, e.g. "Aug 2023". Optional: when omitted the
   * caption shows the issuer alone rather than an invented date.
   */
  date: z.string().min(1).optional(),
  /** Path to the badge image in `public/`. */
  imageUrl: z.string().min(1),
  /** Non-empty alt text, also used as the fallback label if the image fails. */
  altText: z.string().min(1),
  /** Public verification URL. Omit when there isn't one. */
  verifyUrl: z.string().url().optional(),
});
export type Certification = z.infer<typeof Certification>;

export const Certifications = z
  .array(Certification)
  .min(1)
  .refine(
    (c) => new Set(c.map((x) => x.name)).size === c.length,
    'certification names must be unique',
  );
export type Certifications = z.infer<typeof Certifications>;

export const certifications: Certifications = Certifications.parse([
  {
    name: 'AWS Certified Solutions Architect – Professional',
    issuer: 'Amazon Web Services',
    date: 'Jul 2026',
    imageUrl: '/images/certs/awssap.png',
    altText: 'AWS Certified Solutions Architect – Professional badge',
    verifyUrl:
      'https://www.credly.com/badges/73e66e52-cf7f-433e-a47d-4284a4557dc4/public_url',
  },
  {
    name: 'AWS Certified Cloud Practitioner',
    issuer: 'Amazon Web Services',
    date: 'Aug 2023',
    imageUrl: '/images/certs/awscp.png',
    altText: 'AWS Certified Cloud Practitioner badge',
    verifyUrl:
      'https://www.credly.com/badges/7d6115f8-02b7-4810-91e4-ebcd40e182ef/public_url',
  },
  {
    name: 'Microsoft Azure Fundamentals',
    issuer: 'Microsoft',
    date: 'Feb, 2023',
    imageUrl: '/images/certs/azurecf.png',
    altText: 'Microsoft Azure Fundamentals badge',
    verifyUrl:
      'https://www.credly.com/badges/0d7c495d-42dc-4aa4-a5a2-c4c09f1e2e2c/public_url',
  },
]);
