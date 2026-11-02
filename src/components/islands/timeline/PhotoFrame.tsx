/**
 * PhotoFrame — a captioned photo slot.
 *
 * With a `src` it is a plain lazy-loaded image. Without one it shows a hatched
 * frame marked "photo to come", so an empty slot reads as waiting for its
 * picture rather than broken. To fill a slot, add the file under
 * `public/images/rides/` and set `src` in `src/data/konkan.ts`.
 */
import type { PhotoSlot } from '../../../data/konkan';

interface PhotoFrameProps {
  readonly photo: PhotoSlot;
}

export default function PhotoFrame({ photo }: PhotoFrameProps) {
  return (
    <figure className="min-w-0">
      {photo.src ? (
        <img
          src={photo.src}
          alt={photo.alt ?? photo.caption}
          loading="lazy"
          decoding="async"
          className="aspect-[3/2] w-full border border-rule object-cover"
        />
      ) : (
        <div className="photo-empty grid aspect-[3/2] w-full place-items-center border border-dashed border-ink/40">
          <span className="bg-paper px-2 text-base italic text-muted">photo to come</span>
        </div>
      )}
      <figcaption className="mt-1 text-base italic leading-snug text-muted">{photo.caption}</figcaption>
    </figure>
  );
}
