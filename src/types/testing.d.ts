/**
 * Registers the @testing-library/jest-dom matchers with Vitest's `Assertion`
 * type for the whole program.
 *
 * The runtime side of this is wired in `vitest.setup.ts`; this file exists purely
 * so `tsc` / `astro check` also know about `toBeInTheDocument`,
 * `toHaveAttribute`, and friends. Without it the matchers work at runtime but
 * fail type checking.
 */
import '@testing-library/jest-dom/vitest';
