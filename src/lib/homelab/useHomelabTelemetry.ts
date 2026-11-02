import { useSyncExternalStore } from 'react';

import { getServerSnapshot, getSnapshot, subscribe, type HomelabTelemetry } from './telemetry';

/** Current homelab readings, shared across every island on the page. */
export function useHomelabTelemetry(): HomelabTelemetry {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** "09:41:07 IST", or an em dash before the first reading. */
export function formatReadingTime(epochMs: number | null): string {
  if (epochMs === null) return '—';
  const time = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'Asia/Kolkata',
  }).format(epochMs);
  return `${time} IST`;
}
