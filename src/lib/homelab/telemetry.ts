/**
 * Homelab telemetry: one shared store for any island that shows the box's
 * readings (currently the homelab section on /work).
 *
 * Islands on the same page share this module instance, so however many
 * subscribers there are, there is one request and one timer.
 *
 * Source of readings, in order of preference:
 *  1. `SITE_CONFIG.homelabStatusEndpoint`, fetched without blocking anything.
 *     It must return JSON matching `HomelabStatusPayload`.
 *  2. A simulation: a mean-reverting random walk around realistic baselines,
 *     so a static build still looks alive. The UI labels these readings as
 *     simulated, so nobody mistakes them for measurements.
 *
 * SSR safety: nothing here touches `window` until the first subscriber
 * arrives, and `getServerSnapshot` returns the fixed baseline, so the first
 * client render matches the server HTML exactly.
 */
import { SITE_CONFIG } from '../../config/site';

export type NodeStatus = 'online' | 'degraded' | 'offline';

export interface HomelabTelemetry {
  readonly node: string;
  readonly status: NodeStatus;
  /** Rolling uptime, as a percentage. */
  readonly uptimePct: number;
  readonly cpuTempC: number;
  readonly memoryUsedGb: number;
  readonly memoryTotalGb: number;
  readonly containers: number;
  /** Edge-to-origin latency for the last request, in milliseconds. */
  readonly ingressLatencyMs: number;
  /** Epoch milliseconds of the reading, or `null` before the first one. */
  readonly observedAt: number | null;
  readonly source: 'live' | 'simulated';
}

/**
 * The JSON contract for `homelabStatusEndpoint`. Every field is required;
 * anything else in the response is ignored. Example:
 *
 * ```json
 * { "status": "online", "uptimePct": 99.94, "cpuTempC": 44.2,
 *   "memoryUsedGb": 9.6, "memoryTotalGb": 16, "containers": 14,
 *   "ingressLatencyMs": 38, "observedAt": "2026-11-01T09:41:07Z" }
 * ```
 */
export interface HomelabStatusPayload {
  status: NodeStatus;
  uptimePct: number;
  cpuTempC: number;
  memoryUsedGb: number;
  memoryTotalGb: number;
  containers: number;
  ingressLatencyMs: number;
  /** ISO 8601 timestamp. */
  observedAt: string;
}

/** What the box usually looks like. Also the server-rendered snapshot. */
// TODO: tune these to the real box once the status feed is wired up.
export const BASELINE: HomelabTelemetry = {
  node: 'Pune, IN · Bare Metal',
  status: 'online',
  uptimePct: 99.94,
  cpuTempC: 44,
  memoryUsedGb: 9.6,
  memoryTotalGb: 16,
  containers: 14,
  ingressLatencyMs: 38,
  observedAt: null,
  source: 'simulated',
};

const SIMULATION_TICK_MS = 3_000;
const LIVE_POLL_MS = 30_000;
const FETCH_TIMEOUT_MS = 4_000;

// ---------------------------------------------------------------------------
// Pure helpers (no DOM, no timers)
// ---------------------------------------------------------------------------

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

/** Rounds to `digits` decimal places. */
const round = (value: number, digits: number): number => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

/**
 * One step of the simulation. Each reading drifts randomly but is pulled back
 * toward its baseline, so values wander without running away. `random` is
 * injectable so the walk is deterministic under test.
 */
export function jitter(
  previous: HomelabTelemetry,
  now: number,
  random: () => number = Math.random,
  baseline: HomelabTelemetry = BASELINE,
): HomelabTelemetry {
  const step = (value: number, base: number, amplitude: number) =>
    value + (base - value) * 0.35 + (random() - 0.5) * amplitude;

  // Containers change rarely: a one-in-ten chance per tick of a job starting or
  // finishing, never straying more than two from the baseline.
  const roll = random();
  const containerDelta = roll < 0.05 ? -1 : roll > 0.95 ? 1 : 0;

  return {
    ...previous,
    status: 'online',
    cpuTempC: round(clamp(step(previous.cpuTempC, baseline.cpuTempC, 2.4), 38, 58), 1),
    memoryUsedGb: round(
      clamp(step(previous.memoryUsedGb, baseline.memoryUsedGb, 0.5), 4, previous.memoryTotalGb - 0.5),
      1,
    ),
    containers: clamp(previous.containers + containerDelta, baseline.containers - 2, baseline.containers + 2),
    ingressLatencyMs: Math.round(clamp(step(previous.ingressLatencyMs, baseline.ingressLatencyMs, 14), 18, 120)),
    observedAt: now,
    source: 'simulated',
  };
}

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

/** Validates an endpoint response. Returns `null` for anything off-contract. */
export function parseStatusPayload(input: unknown, baseline: HomelabTelemetry = BASELINE): HomelabTelemetry | null {
  if (typeof input !== 'object' || input === null) return null;
  const data = input as Record<string, unknown>;

  const status = data['status'];
  if (status !== 'online' && status !== 'degraded' && status !== 'offline') return null;

  const numericKeys = [
    'uptimePct',
    'cpuTempC',
    'memoryUsedGb',
    'memoryTotalGb',
    'containers',
    'ingressLatencyMs',
  ] as const;
  for (const key of numericKeys) {
    if (!isFiniteNumber(data[key])) return null;
  }

  const observedAt = typeof data['observedAt'] === 'string' ? Date.parse(data['observedAt']) : Number.NaN;
  if (Number.isNaN(observedAt)) return null;

  return {
    node: baseline.node,
    status,
    uptimePct: data['uptimePct'] as number,
    cpuTempC: data['cpuTempC'] as number,
    memoryUsedGb: data['memoryUsedGb'] as number,
    memoryTotalGb: data['memoryTotalGb'] as number,
    containers: Math.round(data['containers'] as number),
    ingressLatencyMs: Math.round(data['ingressLatencyMs'] as number),
    observedAt,
    source: 'live',
  };
}

// ---------------------------------------------------------------------------
// The store
// ---------------------------------------------------------------------------

let snapshot: HomelabTelemetry = BASELINE;
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;
let mode: 'idle' | 'probing' | 'live' | 'simulated' = 'idle';

function publish(next: HomelabTelemetry): void {
  snapshot = next;
  for (const listener of listeners) listener();
}

async function fetchStatus(endpoint: string): Promise<HomelabTelemetry | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(endpoint, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    // A static host answers a missing file with an HTML 404 page, so check
    // both the status and the content type before parsing.
    const type = response.headers.get('content-type') ?? '';
    if (!response.ok || !type.includes('json')) return null;
    return parseStatusPayload(await response.json());
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function stopTimer(): void {
  if (timer !== null) clearInterval(timer);
  timer = null;
}

function startSimulation(): void {
  mode = 'simulated';
  stopTimer();
  publish(jitter(snapshot, Date.now()));
  timer = setInterval(() => {
    if (document.visibilityState === 'hidden') return;
    publish(jitter(snapshot, Date.now()));
  }, SIMULATION_TICK_MS);
}

function startLivePolling(endpoint: string): void {
  mode = 'live';
  stopTimer();
  timer = setInterval(() => {
    if (document.visibilityState === 'hidden') return;
    void fetchStatus(endpoint).then((reading) => {
      if (mode !== 'live') return;
      // Losing the feed mid-session falls back to the simulation rather than
      // freezing on a stale reading.
      if (reading) publish(reading);
      else startSimulation();
    });
  }, LIVE_POLL_MS);
}

function start(): void {
  if (mode !== 'idle') return;
  const endpoint = SITE_CONFIG.homelabStatusEndpoint;
  if (!endpoint) {
    startSimulation();
    return;
  }

  mode = 'probing';
  void fetchStatus(endpoint).then((reading) => {
    // Every subscriber may have left while the request was in flight.
    if (mode !== 'probing') return;
    if (reading) {
      publish(reading);
      startLivePolling(endpoint);
    } else {
      startSimulation();
    }
  });
}

function stop(): void {
  stopTimer();
  mode = 'idle';
}

/** `useSyncExternalStore` subscribe. The first subscriber starts the feed. */
export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  start();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) stop();
  };
}

export function getSnapshot(): HomelabTelemetry {
  return snapshot;
}

export function getServerSnapshot(): HomelabTelemetry {
  return BASELINE;
}
