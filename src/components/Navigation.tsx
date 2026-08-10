/**
 * Navigation — floating macOS-style dock (React island).
 *
 * A compact shortcut bar pinned near the bottom of the viewport: section jump
 * links from the validated navigation content layer, then social shortcuts from
 * the profile layer, then the theme toggle.
 *
 * Dock behaviour, modelled on the macOS Dock:
 *  - Each icon magnifies with a cosine falloff based on its distance to the
 *    pointer, pushing its neighbours apart. Disabled under reduced motion.
 *  - A tooltip with a caret appears above the hovered or keyboard-focused item.
 *    Nothing in the tooltip's ancestor chain may clip: the `<ul>` therefore only
 *    scrolls horizontally below `md`, where tooltips are hidden anyway.
 *  - The section currently in view gets a "running app" dot beneath its icon and
 *    a brightened tile, so the dock doubles as a position indicator.
 *  - Every icon sits on a rounded-square tile at a consistent optical weight
 *    (all glyphs are stroked, including the brand marks, so no single icon reads
 *    heavier than its neighbours).
 *
 * Interaction contract:
 *  - Activating a section link brings that section into view. The native anchor
 *    is the no-JS fallback; once hydrated it calls `scrollIntoView`, choosing
 *    `smooth` normally and `auto` under a reduced-motion preference.
 *  - Every item is a >=44x44px touch target and is keyboard operable.
 *
 * The dock renders at every viewport size rather than collapsing into a
 * hamburger, so nav targets are always one tap away and there is no menu state.
 * It server-renders its full contents, so every target is present at first paint
 * without hydration.
 *
 * SSR-safety: `matchMedia`, `IntersectionObserver`, and layout geometry are only
 * touched inside effects and handlers, never during render.
 */
import {
  Fragment,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';

import { navTargets as defaultNavTargets, type NavTargets } from '@content/navigation';
import { profile } from '@content/profile';
import ThemeToggle from '@components/ThemeToggle';

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

/** Minimum touch-target size in CSS pixels. Also the resting icon size. */
const BASE_SIZE = 44;
/** Peak icon size (px) reached by the icon directly under the pointer. */
const PEAK_SIZE = 64;
/** Horizontal reach (px) of the magnification falloff either side of an icon. */
const INFLUENCE_PX = 150;
/** Per-frame easing factor for the size lerp (spring-like settle). */
const LERP = 0.2;
/** Maximum upward lift (px) applied to the most magnified icon. */
const MAX_LIFT_PX = 6;

/**
 * Social shortcuts (by profile name) surfaced in the dock, in this order. Kept
 * to the two direct ways to reach out; GitHub and the blog still appear in the
 * hero's social row and in Contact, so nothing is unreachable.
 */
const DOCK_SOCIAL_NAMES = ['LinkedIn', 'Email'] as const;

// -----------------------------------------------------------------------------
// Icons — all stroked at the same weight so no glyph reads heavier than its
// neighbours. The accessible name comes from each anchor's aria-label, so the
// glyphs are decorative.
// -----------------------------------------------------------------------------

const iconProps = {
  width: 19,
  height: 19,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  focusable: false,
};

/** Glyph per section id. */
const SECTION_ICONS: Record<string, ReactNode> = {
  about: (
    <svg {...iconProps}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" />
    </svg>
  ),
  projects: (
    <svg {...iconProps}>
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2Z" />
    </svg>
  ),
  experience: (
    <svg {...iconProps}>
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  ),
  skills: (
    <svg {...iconProps}>
      <path d="m16 18 6-6-6-6M8 6l-6 6 6 6" />
    </svg>
  ),
  certifications: (
    <svg {...iconProps}>
      <circle cx="12" cy="8" r="6" />
      <path d="M15.48 12.89 17 22l-5-3-5 3 1.52-9.11" />
    </svg>
  ),
  achievements: (
    <svg {...iconProps}>
      <path d="M7 4h10v6a5 5 0 0 1-10 0Z" />
      <path d="M7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3" />
      <path d="M12 15v4M8 22h8" />
    </svg>
  ),
  timeline: (
    <svg {...iconProps}>
      <path d="M12 3v18" />
      <circle cx="12" cy="7" r="2" />
      <circle cx="12" cy="17" r="2" />
    </svg>
  ),
  contact: (
    <svg {...iconProps}>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-10 5L2 7" />
    </svg>
  ),
};

/**
 * Glyph per social name. The GitHub and LinkedIn marks are the stroked Lucide
 * variants rather than the solid brand logos, so they sit at the same optical
 * weight as the section icons instead of reading as dark blobs.
 */
const SOCIAL_ICONS: Record<string, ReactNode> = {
  GitHub: (
    <svg {...iconProps}>
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.4 5.4 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  ),
  LinkedIn: (
    <svg {...iconProps}>
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  ),
  Blog: (
    <svg {...iconProps}>
      <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </svg>
  ),
  Email: (
    <svg {...iconProps}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  ),
};

const GLOBE_ICON: ReactNode = (
  <svg {...iconProps}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18" />
    <path d="M12 3c2.5 2.5 3.75 5.75 3.75 9S14.5 18.5 12 21c-2.5-2.5-3.75-5.75-3.75-9S9.5 5.5 12 3Z" />
  </svg>
);

// -----------------------------------------------------------------------------
// Dock item model
// -----------------------------------------------------------------------------

interface DockItem {
  key: string;
  href: string;
  label: string;
  icon: ReactNode;
  /** Section-scroll target id; absent for external social links. */
  sectionId?: string;
  /** External http(s) link opened in a new tab. */
  external?: boolean;
}

export interface NavigationProps {
  /** Section nav targets. Defaults to the validated content-layer seed data. */
  targets?: NavTargets;
}

/** Reads the live reduced-motion preference (SSR-safe). */
function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export default function Navigation({ targets = defaultNavTargets }: NavigationProps) {
  const dockItems: DockItem[] = useMemo(
    () => [
      ...targets.map(
        (t): DockItem => ({
          key: t.sectionId,
          href: `#${t.sectionId}`,
          label: t.label,
          icon: SECTION_ICONS[t.sectionId] ?? GLOBE_ICON,
          sectionId: t.sectionId,
        }),
      ),
      ...DOCK_SOCIAL_NAMES.flatMap((name): DockItem[] => {
        const social = profile.socials.find((s) => s.name === name);
        if (!social) return [];
        return [
          {
            key: social.name,
            href: social.url,
            label: social.name,
            icon: SOCIAL_ICONS[social.name] ?? GLOBE_ICON,
            external: /^https?:\/\//.test(social.url),
          },
        ];
      }),
    ],
    [targets],
  );

  // A divider separates the section links from the social shortcuts.
  const firstSocialIndex = dockItems.findIndex((item) => item.external);

  const [reduceMotion, setReduceMotion] = useState(false);
  /** Section id currently in view, used for the running-app dot. */
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const menuId = useId();

  /**
   * Every magnifiable control, in visual order. Typed as `HTMLElement` because
   * the last entry is the theme toggle's <button> rather than an <a> — it is a
   * dock item like any other and must magnify with its neighbours.
   */
  const iconRefs = useRef<(HTMLElement | null)[]>([]);
  /** Index reserved for the theme toggle, which follows the dock items. */
  const themeToggleIndex = dockItems.length;
  const sizesRef = useRef<number[]>(
    Array.from({ length: dockItems.length + 1 }, () => BASE_SIZE),
  );
  const pointerXRef = useRef<number>(Infinity);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduceMotion(mql.matches);
    sync();
    mql.addEventListener('change', sync);
    return () => mql.removeEventListener('change', sync);
  }, []);

  // -- Active section tracking ---------------------------------------------
  //
  // Observes every section the dock links to and marks whichever is most visible
  // as active. Purely additive: with no IntersectionObserver the dot simply never
  // appears and every link still works.

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;

    const sectionIds = dockItems
      .map((item) => item.sectionId)
      .filter((id): id is string => typeof id === 'string');

    const elements = sectionIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    if (elements.length === 0) return;

    // Track ratios per section so the *most* visible one wins, rather than
    // whichever fired its callback last.
    const ratios = new Map<string, number>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          ratios.set(entry.target.id, entry.isIntersecting ? entry.intersectionRatio : 0);
        }
        let best: string | null = null;
        let bestRatio = 0;
        for (const [id, ratio] of ratios) {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            best = id;
          }
        }
        setActiveSection(best);
      },
      // A spread of thresholds keeps the winner accurate for both short and tall
      // sections without needing a scroll listener.
      { threshold: [0, 0.15, 0.3, 0.5, 0.75, 1] },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [dockItems]);

  // -- Magnification -------------------------------------------------------
  //
  // A single requestAnimationFrame loop lerps each icon's size toward a target
  // derived from its distance to the pointer. Reads and writes are split into two
  // passes so geometry reads are never interleaved with style writes.

  const step = useCallback(() => {
    const els = iconRefs.current;
    const px = pointerXRef.current;

    // Pass 1: read geometry, compute targets.
    const targetsPx: number[] = [];
    for (let i = 0; i < els.length; i += 1) {
      const el = els[i];
      if (!el) {
        targetsPx[i] = BASE_SIZE;
        continue;
      }
      const rect = el.getBoundingClientRect();
      const center = rect.left + rect.width / 2;
      const dist = px === Infinity ? Infinity : Math.abs(px - center);
      if (dist >= INFLUENCE_PX) {
        targetsPx[i] = BASE_SIZE;
      } else {
        // Cosine falloff gives a smooth genie curve: 1 at the cursor, 0 at edge.
        const t = 0.5 * (1 + Math.cos((dist / INFLUENCE_PX) * Math.PI));
        targetsPx[i] = BASE_SIZE + (PEAK_SIZE - BASE_SIZE) * t;
      }
    }

    // Pass 2: lerp toward the target, then write size and lift together.
    let settled = true;
    for (let i = 0; i < els.length; i += 1) {
      const el = els[i];
      const cur = sizesRef.current[i] ?? BASE_SIZE;
      const goal = targetsPx[i] ?? BASE_SIZE;
      const next = cur + (goal - cur) * LERP;
      sizesRef.current[i] = next;
      if (el) {
        el.style.width = `${next}px`;
        el.style.height = `${next}px`;
        // Lift scales with how magnified the icon is, so the row bows upward
        // toward the cursor the way the macOS Dock does.
        const progress = (next - BASE_SIZE) / (PEAK_SIZE - BASE_SIZE);
        el.style.transform = `translateY(${-progress * MAX_LIFT_PX}px)`;
      }
      if (Math.abs(next - goal) > 0.1) settled = false;
    }

    rafRef.current = settled ? null : requestAnimationFrame(step);
  }, []);

  const kick = useCallback(() => {
    if (rafRef.current == null) rafRef.current = requestAnimationFrame(step);
  }, [step]);

  const handleDockPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      // Only a fine pointer drives magnification; a touch "hover" would leave
      // the dock stuck mid-magnification after the finger lifts.
      if (reduceMotion || event.pointerType !== 'mouse') return;
      pointerXRef.current = event.clientX;
      kick();
    },
    [kick, reduceMotion],
  );

  const handleDockPointerLeave = useCallback(() => {
    if (reduceMotion) return;
    pointerXRef.current = Infinity;
    kick();
  }, [kick, reduceMotion]);

  useEffect(
    () => () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  // Bring the activated section into view, honoring reduced motion.
  const handleActivate = useCallback(
    (event: MouseEvent<HTMLAnchorElement>, sectionId: string) => {
      const target =
        typeof document !== 'undefined' ? document.getElementById(sectionId) : null;

      // No target in the DOM: fall back to native anchor navigation.
      if (!target) return;

      event.preventDefault();
      target.scrollIntoView({
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
        block: 'start',
      });

      // Keep the URL hash in sync and move focus for keyboard users, without
      // triggering a second (jump) scroll.
      if (typeof history !== 'undefined' && typeof history.replaceState === 'function') {
        history.replaceState(null, '', `#${sectionId}`);
      }
      target.focus?.({ preventScroll: true });
    },
    [],
  );

  return (
    <nav aria-label="Primary" className="contents">
      <div className="pointer-events-none fixed inset-x-0 bottom-3 z-50 flex justify-center px-2 md:bottom-5">
        <ul
          id={menuId}
          onPointerMove={handleDockPointerMove}
          onPointerLeave={handleDockPointerLeave}
          /*
            `overflow-x-auto` is confined to below `md`. A scroll container clips
            on BOTH axes, which would cut the tooltip off above the dock; above
            `md` the dock must not clip. Tooltips are hidden below `md` anyway,
            so nothing is lost.
          */
          className="glass-panel pointer-events-auto flex max-w-full items-end gap-1 overflow-x-auto rounded-[1.4rem] px-2 py-2 md:gap-1.5 md:overflow-x-visible md:px-2.5"
        >
          {dockItems.map((item, index) => {
            const isActive =
              item.sectionId !== undefined && item.sectionId === activeSection;

            return (
              <Fragment key={item.key}>
                {index === firstSocialIndex && firstSocialIndex > 0 && (
                  <li aria-hidden="true" className="mx-1 flex items-center self-center">
                    <span className="block h-7 w-px bg-foreground/10" />
                  </li>
                )}
                <li className="group relative flex flex-col items-center">
                  {/* Tooltip with a caret, shown on hover and keyboard focus.
                      Hidden below `md`, where there is no cursor to hover with.

                      Keyboard focus is matched with `:has(:focus-visible)` rather
                      than `focus-within`. The group is this `<li>`, which is not
                      focusable, so `group-focus-visible` can never match it — but
                      plain `focus-within` matches a mouse click too, and a clicked
                      dock link keeps focus, which left the label stuck open after
                      the pointer moved away. `:focus-visible` is only set when the
                      browser decides focus should be shown, i.e. keyboard
                      navigation, which is exactly the case the label is for.

                      Where `:has()` is unsupported the label simply stops
                      appearing on focus. That is a safe degradation: this span is
                      `aria-hidden` and the link carries the same text as its
                      `aria-label`, so nothing is lost to assistive tech. */}
                  <span
                    aria-hidden="true"
                    className="glass-panel pointer-events-none absolute bottom-full left-1/2 z-10 mb-2.5 hidden -translate-x-1/2 scale-95 whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-medium text-foreground opacity-0 transition-all duration-150 group-hover:scale-100 group-hover:opacity-100 group-[:has(:focus-visible)]:scale-100 group-[:has(:focus-visible)]:opacity-100 motion-reduce:transition-none md:block"
                  >
                    {item.label}
                    {/* Caret: a rotated square tucked under the bubble's edge.
                        It inherits no backdrop-filter, so it uses a flat neutral
                        fill matched to the bubble it hangs from. */}
                    <span className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1 rotate-45 border-b border-r border-white/[0.14] bg-white/[0.08]" />
                  </span>

                  <a
                    ref={(el) => {
                      iconRefs.current[index] = el;
                    }}
                    href={item.href}
                    aria-label={item.label}
                    aria-current={isActive ? 'true' : undefined}
                    onClick={
                      item.sectionId
                        ? (event) => handleActivate(event, item.sectionId as string)
                        : undefined
                    }
                    target={item.external ? '_blank' : undefined}
                    rel={item.external ? 'noopener noreferrer' : undefined}
                    style={{ width: `${BASE_SIZE}px`, height: `${BASE_SIZE}px` }}
                    /* `rounded-[28%]` tracks the icon size as it magnifies, giving
                       the squircle proportions of a macOS app tile. */
                    /* Active state is the one place a hue is allowed: it carries
                       meaning (which section you are in), not decoration. */
                    className={`grid aspect-square shrink-0 place-items-center rounded-[28%] outline-none will-change-[width,height,transform] focus-visible:ring-2 focus-visible:ring-primary ${
                      isActive
                        ? 'border border-primary/40 bg-primary/15 text-primary'
                        : 'glass-tile text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {item.icon}
                  </a>

                  {/* Running-app dot: marks the section currently in view. The
                      row is always rendered so the dock's height never shifts as
                      the dot appears and disappears. */}
                  <span
                    aria-hidden="true"
                    className={`mt-1 block h-1 w-1 rounded-full transition-colors ${
                      isActive ? 'bg-primary' : 'bg-transparent'
                    }`}
                  />
                </li>
              </Fragment>
            );
          })}

          {/* Theme toggle — an additional control (a button), not a nav target. */}
          <li aria-hidden="true" className="mx-1 flex items-center self-center">
            <span className="block h-7 w-px bg-foreground/10" />
          </li>
          <li className="flex flex-col items-center">
            {/* Registered in `iconRefs` so it magnifies and lifts along with the
                icons either side of it, the way the macOS Dock treats the Trash. */}
            <ThemeToggle
              ref={(el) => {
                iconRefs.current[themeToggleIndex] = el;
              }}
            />
            {/* Spacer matching the dot row above, so the toggle stays aligned
                with the icon tiles rather than sitting 4px lower. */}
            <span aria-hidden="true" className="mt-1 block h-1 w-1" />
          </li>
        </ul>
      </div>
    </nav>
  );
}
