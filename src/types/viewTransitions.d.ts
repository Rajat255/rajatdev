/**
 * Ambient types for the View Transitions API.
 *
 * TypeScript's bundled `lib.dom.d.ts` does not yet declare it, and the theme
 * ripple feature-detects the method rather than assuming it exists, so it is
 * declared optional here.
 */

interface ViewTransition {
  /** Resolves once the transition has finished or been skipped. */
  readonly finished: Promise<void>;
  /** Resolves once the pseudo-element tree is built and animations can start. */
  readonly ready: Promise<void>;
  /** Resolves once the DOM-update callback has run. */
  readonly updateCallbackDone: Promise<void>;
  /** Abandons the animation, jumping straight to the final state. */
  skipTransition(): void;
}

interface Document {
  /**
   * Snapshots the document, runs `callback` to mutate the DOM, then animates
   * between the two states. Optional: not implemented in every browser.
   */
  startViewTransition?(callback: () => void | Promise<void>): ViewTransition;
}
