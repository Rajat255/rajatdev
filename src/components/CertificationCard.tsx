/**
 * CertificationCard — an interactive certification badge (React island).
 *
 * Interaction contract:
 *  - Pointer hover or keyboard focus applies a visible transformation within
 *    200ms; ending the hover/focus reverts it within 200ms. Motion is requested
 *    through the shared AnimationEngine, so reduced-motion resolution and
 *    animation-failure fallbacks stay centralized. A CSS filter change driven by
 *    native hover/focus and by the engine's `data-highlight` flag guarantees a
 *    visible transformation even when the scale motion is collapsed away.
 *
 * Image-load-failure contract:
 *  - If the badge image fails to load, the card swaps the <img> for a styled box
 *    sized to the same reserved aspect-ratio slot, showing the certification
 *    name plus an "Image unavailable" note. No broken-image icon is ever shown,
 *    and the layout does not shift.
 *
 * This island owns no content: name, image, alt text, and the optional verify
 * URL all arrive as props from the validated certifications content module.
 */
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FocusEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';

import { getAnimationEngine, type AnimationEngine } from '@animation/AnimationEngine';

export interface CertificationCardProps {
  name: string;
  issuer: string;
  /** Award date. Omitted when unknown, in which case the caption shows the issuer alone. */
  date?: string;
  imageUrl: string;
  altText: string;
  /** Public verification URL. When present the badge becomes a link. */
  verifyUrl?: string;
}

export default function CertificationCard({
  name,
  issuer,
  date,
  imageUrl,
  altText,
  verifyUrl,
}: CertificationCardProps) {
  const engineRef = useRef<AnimationEngine | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [imageFailed, setImageFailed] = useState(false);

  // This island hydrates lazily and the image loads lazily, so the browser can
  // fire the native `error` event *before* React attaches `onError`. In that
  // race the handler never runs. On mount, inspect the real DOM node: a load
  // that has finished (`complete`) with no pixels (`naturalWidth === 0`) means
  // it already failed, so flip to the fallback. `onError` still covers failures
  // that happen after hydration.
  useEffect(() => {
    const img = imgRef.current;
    if (img !== null && img.complete && img.naturalWidth === 0) {
      setImageFailed(true);
    }
  }, []);

  // Lazily obtain the shared engine on first interaction so importing or
  // server-rendering this island never touches `window`.
  const getEngine = useCallback((): AnimationEngine => {
    if (engineRef.current === null) engineRef.current = getAnimationEngine();
    return engineRef.current;
  }, []);

  const applyTransform = useCallback(
    (event: ReactPointerEvent<HTMLElement> | FocusEvent<HTMLElement>) => {
      getEngine().highlight(event.currentTarget);
    },
    [getEngine],
  );

  const revertTransform = useCallback(
    (event: ReactPointerEvent<HTMLElement> | FocusEvent<HTMLElement>) => {
      getEngine().removeHighlight(event.currentTarget);
    },
    [getEngine],
  );

  const badge = imageFailed ? (
    <div
      role="img"
      aria-label={`${name} — image unavailable`}
      data-cert-fallback
      className="flex h-full w-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-white/20 bg-white/[0.04] px-3 text-center"
    >
      <span className="text-sm font-semibold leading-tight text-card-foreground">
        {name}
      </span>
      <span className="text-xs text-muted-foreground">Image unavailable</span>
    </div>
  ) : (
    <img
      ref={imgRef}
      src={imageUrl}
      alt={altText}
      loading="lazy"
      decoding="async"
      onError={() => setImageFailed(true)}
      className="h-full w-full rounded-lg object-contain drop-shadow-[0_10px_24px_rgba(0,0,0,0.35)] transition duration-150 ease-out group-hover:brightness-110 group-hover:saturate-150 group-focus-within:brightness-110 group-focus-within:saturate-150 group-data-[highlight=on]:brightness-110 group-data-[highlight=on]:saturate-150 motion-reduce:transition-none"
    />
  );

  // The interactive frame. When a verification URL exists the frame is an
  // anchor, so the whole badge is one clickable, keyboard-reachable target;
  // otherwise it is a plain focusable group.
  //
  // No card chrome: the badge artwork carries its own silhouette, so a glass
  // panel behind it only competes with it. Depth comes from the badge's drop
  // shadow, and the frame keeps just the square aspect slot (so a failed image
  // reserves the same space) plus the focus ring.
  const frameClass =
    'group relative flex aspect-square w-full items-center justify-center rounded-2xl outline-none will-change-transform focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-4 focus-visible:ring-offset-background motion-reduce:transition-none';

  return (
    // `max-w` caps the badge below its column width so the artwork stays
    // comfortably scaled on wide viewports instead of growing to fill the grid
    // cell; the figure centres itself in whatever column it lands in.
    <figure className="mx-auto flex w-full max-w-[11rem] flex-col items-center gap-3">
      {verifyUrl ? (
        <a
          href={verifyUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${name} — verify credential`}
          data-cert-frame
          onPointerEnter={applyTransform}
          onPointerLeave={revertTransform}
          onFocus={applyTransform}
          onBlur={revertTransform}
          className={frameClass}
        >
          {badge}
        </a>
      ) : (
        <div
          role="group"
          aria-label={name}
          tabIndex={0}
          data-cert-frame
          onPointerEnter={applyTransform}
          onPointerLeave={revertTransform}
          onFocus={applyTransform}
          onBlur={revertTransform}
          className={frameClass}
        >
          {badge}
        </div>
      )}

      {/* Persistent caption so the certification is always identifiable,
          independent of image load state. */}
      <figcaption className="text-center">
        <span className="block text-sm font-medium leading-snug text-muted-foreground">
          {name}
        </span>
        <span className="mt-0.5 block text-xs leading-snug text-muted-foreground/70">
          {date === undefined ? issuer : `${issuer} · ${date}`}
        </span>
      </figcaption>
    </figure>
  );
}
