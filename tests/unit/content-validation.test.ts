import { describe, expect, it } from 'vitest';

import { profile, ProfileSchema } from '@content/profile';
import { about, AboutSchema } from '@content/about';
import { skillGroups, SkillGroups, allSkills } from '@content/skills';
import { experience, Experience } from '@content/experience';
import { projects, Projects, orderedProjects } from '@content/projects';
import { certifications, Certifications } from '@content/certifications';
import { achievements, Achievements } from '@content/achievements';
import { timeline, Timeline } from '@content/timeline';
import { navTargets, NavTargets, allSectionIds } from '@content/navigation';

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

describe('about', () => {
  it('satisfies its schema', () => {
    expect(() => AboutSchema.parse(about)).not.toThrow();
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

describe('timeline', () => {
  it('satisfies its schema', () => {
    expect(() => Timeline.parse(timeline)).not.toThrow();
  });
});

describe('navigation', () => {
  it('satisfies its schema', () => {
    expect(() => NavTargets.parse(navTargets)).not.toThrow();
  });

  it('references only known section ids', () => {
    for (const target of navTargets) {
      expect(allSectionIds).toContain(target.sectionId);
    }
  });

  it('rejects duplicate section ids', () => {
    const result = NavTargets.safeParse([
      { sectionId: 'about', label: 'About' },
      { sectionId: 'about', label: 'About again' },
    ]);
    expect(result.success).toBe(false);
  });
});
