/**
 * KonkanRoute — the route map for the 2024 Konkan coast ride, unfolded from
 * the timeline.
 *
 * A schematic map (real coordinates, projected; see src/data/konkan.ts) with
 * the coastal leg drawn solid and the way home over the ghats dashed. Choosing
 * a stop highlights it on the map and prints its note.
 */
import { useId, useState } from 'react';

import { konkanRide } from '../../../data/konkan';
import PhotoFrame from './PhotoFrame';

export default function KonkanRoute() {
  const [selected, setSelected] = useState(0);
  const hatchId = `konkan-sea-${useId().replace(/:/g, '')}`;
  const stop = konkanRide.stops[selected];

  return (
    <div className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-[11rem_1fr]">
        <figure>
          <svg
            viewBox="0 0 220 430"
            role="img"
            aria-label="Map of the route down the Konkan coast from Mumbai to Goa, and back inland to Pune"
            className="mx-auto w-full max-w-[11rem] text-ink"
          >
            <defs>
              <pattern id={hatchId} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="6" className="stroke-rule" strokeWidth="1.4" />
              </pattern>
            </defs>
            {/* The Arabian Sea: everything west of the coastline. */}
            <path d={`${konkanRide.coastline} L0 430 L0 0 Z`} fill={`url(#${hatchId})`} />
            <path d={konkanRide.coastline} fill="none" stroke="currentColor" strokeWidth={1.1} />
            <text x={16} y={210} className="fill-muted font-serif text-[12px] italic" transform="rotate(-90 16 210)">
              Arabian Sea
            </text>

            <path d={konkanRide.outbound} fill="none" className="stroke-accent" strokeWidth={2.4} strokeLinejoin="round" />
            <path
              d={konkanRide.inbound}
              fill="none"
              stroke="currentColor"
              strokeWidth={1.3}
              strokeDasharray="4 4"
              strokeLinejoin="round"
            />

            {konkanRide.stops.map((s, i) => {
              const active = i === selected;
              return (
                <g key={s.name}>
                  <circle
                    cx={s.x}
                    cy={s.y}
                    r={active ? 6 : 4}
                    className={active ? 'fill-accent stroke-paper' : 'fill-paper'}
                    stroke={active ? undefined : 'currentColor'}
                    strokeWidth={active ? 2 : 1.4}
                  />
                  <text
                    x={s.x + 9}
                    y={s.y + 4}
                    className={`font-serif text-[16px] ${active ? 'fill-accent font-semibold' : 'fill-ink'}`}
                  >
                    {s.name}
                  </text>
                </g>
              );
            })}
          </svg>
          <figcaption className="mt-1 text-center text-sm italic text-muted">
            Solid: the coast road. Dashed: home over the ghats.
          </figcaption>
        </figure>

        <div className="min-w-0">
          <p className="text-ink">{konkanRide.route}</p>
          <dl className="mt-3 space-y-1">
            {konkanRide.stats.map((stat) => (
              <div key={stat.label} className="grid grid-cols-[5.5rem_1fr] gap-3">
                <dt className="smallcaps pt-px text-muted">{stat.label}</dt>
                <dd className="text-ink">{stat.value}</dd>
              </div>
            ))}
          </dl>

          <div role="group" aria-label="Stops along the way" className="mt-4 flex flex-wrap gap-x-4">
            {konkanRide.stops.map((s, i) => (
              <button
                key={s.name}
                type="button"
                aria-pressed={i === selected}
                onClick={() => setSelected(i)}
                className="min-h-[40px] text-base text-muted underline-offset-[0.25em] hover:text-accent aria-pressed:text-accent aria-pressed:underline"
              >
                {s.name}
              </button>
            ))}
          </div>
          <p aria-live="polite" className="mt-2 min-h-[3.2em] italic text-ink">
            {stop ? `${stop.name}: ${stop.note}` : null}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {konkanRide.photos.map((photo) => (
          <PhotoFrame key={photo.caption} photo={photo} />
        ))}
      </div>
    </div>
  );
}
