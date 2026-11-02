/**
 * HomelabWidget — readings from the box this site runs on, and the path a
 * request takes to reach it (React island, on /builds/#homelab).
 *
 * Readings come from the shared telemetry store (`lib/homelab/telemetry.ts`),
 * which tries the configured status feed and falls back to a simulation. The
 * note under the table says which one you are looking at.
 *
 * The request path is a native <details>, so it opens without JavaScript.
 * Server-renders the baseline readings, so nothing is missing before hydration.
 */
import { formatReadingTime, useHomelabTelemetry } from '../../lib/homelab/useHomelabTelemetry';

interface Hop {
  readonly label: string;
  readonly note: string;
}

/**
 * How a request for this page reaches the box, in order.
 * TODO: check each note against the real setup and adjust.
 */
const HOPS: readonly Hop[] = [
  { label: 'Your browser', note: 'asking for rajatdev.fun over HTTPS.' },
  { label: 'Cloudflare DNS and edge', note: 'resolves the name and terminates TLS.' },
  { label: 'An encrypted tunnel', note: 'WireGuard / Cloudflare Tunnel, dialled out from the home side.' },
  { label: 'Home fibre in Pune', note: 'an ordinary residential line.' },
  { label: 'A reverse proxy', note: 'routes the hostname to the right container.' },
  { label: 'Docker on a bare-metal Linux host', note: 'the actual box, at home.' },
  { label: 'A static Astro build', note: 'plain HTML files, with no database and no server-side code.' },
];

const STATUS_LABEL = { online: 'Online', degraded: 'Degraded', offline: 'Offline' } as const;

export default function HomelabWidget() {
  const t = useHomelabTelemetry();

  const rows = [
    { label: 'Status', value: `${STATUS_LABEL[t.status]} · ${t.uptimePct.toFixed(2)}% uptime` },
    { label: 'Location', value: t.node },
    { label: 'CPU temperature', value: `${t.cpuTempC.toFixed(1)} °C` },
    { label: 'Memory', value: `${t.memoryUsedGb.toFixed(1)} of ${t.memoryTotalGb} GB` },
    { label: 'Containers', value: `${t.containers} running` },
    { label: 'Ingress latency', value: `${t.ingressLatencyMs} ms` },
    { label: 'Last reading', value: formatReadingTime(t.observedAt) },
  ];

  return (
    <div>
      {/* The values change every few seconds, so the table is deliberately not
          a live region: a screen reader announcing a temperature every three
          seconds would be unbearable. */}
      <dl className="divide-y divide-rule border-y border-rule">
        {rows.map((row) => (
          <div key={row.label} className="flex items-baseline justify-between gap-4 py-2">
            <dt className="text-muted">
              {row.label === 'Status' && (
                <span
                  aria-hidden="true"
                  className={`mr-2 inline-block h-2 w-2 rounded-full align-middle ${
                    t.status === 'offline' ? 'bg-muted' : 'bg-accent'
                  }`}
                />
              )}
              {row.label}
            </dt>
            <dd className="text-right tabular-nums text-ink">{row.value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-base italic text-muted">
        {t.source === 'live'
          ? 'Live, straight from the box.'
          : 'These readings are simulated around the box’s usual numbers until its status feed is connected.'}
      </p>

      <details className="group mt-8">
        <summary className="cursor-pointer text-ink">
          <span className="link">How a request reaches this page</span>
          <span aria-hidden="true" className="ml-2 text-accent group-open:hidden">+</span>
          <span aria-hidden="true" className="ml-2 hidden text-accent group-open:inline">−</span>
        </summary>
        <ol className="fade-in mt-5 space-y-3 border-l border-ink/40 pl-5">
          {HOPS.map((hop, index) => (
            <li key={hop.label} className="relative">
              <span
                aria-hidden="true"
                className="absolute -left-[1.6rem] top-[0.6em] h-2 w-2 rounded-full border border-ink bg-paper"
              />
              <span className="smallcaps mr-2 text-accent">{index + 1}</span>
              <span className="text-ink">{hop.label}</span>
              <span className="text-muted"> — {hop.note}</span>
            </li>
          ))}
        </ol>
      </details>
    </div>
  );
}
