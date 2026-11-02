/**
 * The 2024 Konkan coast ride: route, stats, and photo slots for the expandable
 * map on the threads page timeline.
 *
 * Plain typed data rather than a Zod-validated module: the timeline island
 * imports this directly, and Zod would otherwise ship to the browser.
 *
 * EDIT THIS FILE to drop in ride photos: put the image in `public/images/rides/`
 * and set `src` (and `alt`) on a photo slot. Slots without a `src` show a
 * "photo to come" frame.
 */

export interface PhotoSlot {
  readonly caption: string;
  /** Root-relative path under `public/`. Leave unset for an empty frame. */
  readonly src?: string;
  readonly alt?: string;
}

export interface RouteStop {
  readonly name: string;
  /** SVG coordinates in the map's 220 × 430 viewBox (north is up). */
  readonly x: number;
  readonly y: number;
  readonly note: string;
}

export interface KonkanRide {
  readonly route: string;
  readonly stats: readonly { readonly label: string; readonly value: string }[];
  readonly photos: readonly PhotoSlot[];
  readonly stops: readonly RouteStop[];
  /** The Arabian Sea coastline, in the same projection as the stops. */
  readonly coastline: string;
  /** The coastal leg, Mumbai to Goa. */
  readonly outbound: string;
  /** The way home, inland over the ghats to Pune. */
  readonly inbound: string;
}

/**
 * Stops are projected from their real latitude and longitude
 * (x = (lon − 72.6) × 100 + 20, y = (19.35 − lat) × 100 + 10), so the map is
 * schematic but the geography is right.
 */
export const konkanRide: KonkanRide = {
  route: 'Mumbai → Alibaug → Ratnagiri → Malvan → Goa → Pune',
  stats: [
    { label: 'Distance', value: '1,500+ km' },
    { label: 'Stops', value: '6' },
    { label: 'Terrain', value: 'Ghat sections and coastal highway' },
  ],
  photos: [{ caption: 'The coast road south of Ratnagiri' }, { caption: 'Malvan, late afternoon' }],
  stops: [
    { name: 'Mumbai', x: 48, y: 37, note: 'The start, and the last traffic jam for a while.' },
    { name: 'Alibaug', x: 51, y: 81, note: 'The first stretch of open coast south of the city.' },
    { name: 'Ratnagiri', x: 92, y: 246, note: 'Roughly halfway down the coast, and mango country.' },
    { name: 'Malvan', x: 109, y: 339, note: 'Malvani food. Reason enough for the whole trip.' },
    { name: 'Goa', x: 143, y: 395, note: 'The turnaround point.' },
    { name: 'Pune', x: 146, y: 93, note: 'Home, up the ghats and back onto the plateau.' },
  ],
  coastline:
    'M40 0 L42 45 L40 55 L47 80 L53 115 L60 145 L65 175 L75 215 L87 245 L93 285 L100 315 L105 340 L120 365 L135 390 L140 430',
  outbound: 'M48 37 L51 81 L58 118 L66 160 L78 210 L92 246 L98 284 L109 339 L126 366 L143 395',
  inbound: 'M143 395 L176 330 L184 275 L160 177 L146 93',
};
