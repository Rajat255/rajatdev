import { describe, expect, it } from 'vitest';

import { profile, ProfileSchema } from '@data/profile';
import { skillGroups, SkillGroups, allSkills } from '@data/skills';
import { experience, Experience } from '@data/experience';
import { projects, Projects, orderedProjects } from '@data/projects';
import { certifications, Certifications } from '@data/certifications';
import { achievements, Achievements } from '@data/achievements';
import { stats, Stats } from '@data/stats';
import { showcaseItems, ShowcaseItems } from '@data/showcase';
import { isCounted } from '@lib/stats';
import { caseFiles, CaseFiles } from '@data/caseFiles';

/**
 * Content validation.
 *
 * This suite runs as `npm run validate:content`, which the build invokes before
 * `astro check` and `astro build`. Its job is to fail fast on a bad content edit
 * rather than shipping a broken page, so it asserts both the Zod contracts and
 * the cross-module invariants that a schema alone cannot express.
 */

describe('profile', () => {
  it('satisfies its schema', () => {
    expect(() => ProfileSchema.parse(profile)).not.toThrow();
  });

  it('has at least one navbar social link', () => {
    expect(profile.socials.some((s) => s.navbar)).toBe(true);
  });

  it('points every social at an http(s) or mailto URL', () => {
    for (const social of profile.socials) {
      expect(social.url).toMatch(/^(https?:\/\/|mailto:)/);
    }
  });

  it('references a resume inside the public directory', () => {
    expect(profile.resumeUrl.startsWith('/')).toBe(true);
  });
});

describe('skills', () => {
  it('satisfies its schema', () => {
    expect(() => SkillGroups.parse(skillGroups)).not.toThrow();
  });

  it('has globally unique labels', () => {
    expect(new Set(allSkills).size).toBe(allSkills.length);
  });

  it('rejects a duplicate label across two categories', () => {
    const result = SkillGroups.safeParse([
      { category: 'A', items: ['Docker'] },
      { category: 'B', items: ['Docker'] },
    ]);
    expect(result.success).toBe(false);
  });
});

describe('experience', () => {
  it('satisfies its schema', () => {
    expect(() => Experience.parse(experience)).not.toThrow();
  });

  it('gives every role at least one highlight', () => {
    for (const job of experience) {
      expect(job.highlights.length).toBeGreaterThan(0);
    }
  });
});

describe('projects', () => {
  it('satisfies its schema', () => {
    expect(() => Projects.parse(projects)).not.toThrow();
  });

  it('has unique titles', () => {
    const titles = projects.map((p) => p.title);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it('orders featured projects first without dropping any', () => {
    expect(orderedProjects).toHaveLength(projects.length);
    const featuredCount = projects.filter((p) => p.featured).length;
    for (let i = 0; i < featuredCount; i += 1) {
      expect(orderedProjects[i]?.featured).toBe(true);
    }
  });

  it('rejects a description that is too short to be useful', () => {
    const result = Projects.safeParse([
      { title: 'X', description: 'too short', dates: '2024' },
    ]);
    expect(result.success).toBe(false);
  });
});

describe('certifications', () => {
  it('satisfies its schema', () => {
    expect(() => Certifications.parse(certifications)).not.toThrow();
  });

  it('gives every badge non-empty alt text', () => {
    for (const cert of certifications) {
      expect(cert.altText.trim().length).toBeGreaterThan(0);
    }
  });

  it('references badge images inside the public directory', () => {
    for (const cert of certifications) {
      expect(cert.imageUrl.startsWith('/')).toBe(true);
    }
  });
});

describe('achievements', () => {
  it('satisfies its schema', () => {
    expect(() => Achievements.parse(achievements)).not.toThrow();
  });
});

describe('stats', () => {
  it('satisfies its schema', () => {
    expect(() => Stats.parse(stats)).not.toThrow();
  });

  it('gives every counted stat a countable value', () => {
    // The counter animates `value` numerically, so a non-finite or negative
    // figure would render as NaN mid-animation rather than failing loudly.
    const counted = stats.filter(isCounted);
    expect(counted.length).toBeGreaterThan(0);
    for (const stat of counted) {
      expect(Number.isFinite(stat.value)).toBe(true);
      expect(stat.value).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('showcase', () => {
  it('satisfies its schema', () => {
    expect(() => ShowcaseItems.parse(showcaseItems)).not.toThrow();
  });
});

describe('case studies', () => {
  it('satisfies its schema', () => {
    expect(() => CaseFiles.parse(caseFiles)).not.toThrow();
  });

  it('belongs to a role listed in experience', () => {
    const companies = new Set(experience.map((role) => role.company));
    for (const file of caseFiles) {
      expect(companies.has(file.company)).toBe(true);
    }
  });
});
