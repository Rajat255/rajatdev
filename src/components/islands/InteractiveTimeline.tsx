/**
 * InteractiveTimeline — the timeline on the threads page (React island).
 *
 * Every entry's copy is rendered verbatim from `src/data/timeline.ts`, grouped
 * under its year. Entries with a `feature` get a small "more" button that
 * unfolds an extra beneath them: the Konkan route map, the SAP-C02 exam notes,
 * or a Linux terminal. Extras mount only when opened, so the terminal types out
 * fresh each time.
 *
 * Everything except the extras is server-rendered.
 */
import { useId, useState } from 'react';

import type { TimelineEntry } from '../../data/timeline';
import ExamReport from './timeline/ExamReport';
import KonkanRoute from './timeline/KonkanRoute';
import LinuxTerminal from './timeline/LinuxTerminal';

type Feature = NonNullable<TimelineEntry['feature']>;

export interface InteractiveTimelineProps {
  readonly entries: readonly TimelineEntry[];
  /** Verification link for the SAP-C02 exam notes. */
  readonly examVerifyUrl?: string;
}

const FEATURE_LABEL: Record<Feature, string> = {
  'konkan-route': 'the route',
  'exam-report': 'exam notes',
  'linux-terminal': '$ uptime',
};

interface YearGroup {
  readonly year: string;
  readonly entries: readonly TimelineEntry[];
}

/** Groups consecutive entries by the four-digit year in their date label. */
function groupByYear(entries: readonly TimelineEntry[]): YearGroup[] {
  const groups: { year: string; entries: TimelineEntry[] }[] = [];
  for (const entry of entries) {
    const year = /\d{4}/.exec(entry.date)?.[0] ?? entry.date;
    const last = groups.at(-1);
    if (last && last.year === year) last.entries.push(entry);
    else groups.push({ year, entries: [entry] });
  }
  return groups;
}

/** "Jul 2026" → "Jul"; a bare year has no month to show. */
function monthOf(date: string): string | null {
  const month = date.replace(/\d{4}/, '').trim();
  return month.length > 0 ? month : null;
}

function FeaturePanel({ feature, examVerifyUrl }: { feature: Feature; examVerifyUrl?: string }) {
  switch (feature) {
    case 'konkan-route':
      return <KonkanRoute />;
    case 'exam-report':
      return <ExamReport verifyUrl={examVerifyUrl} />;
    case 'linux-terminal':
      return <LinuxTerminal />;
  }
}

function Entry({ entry, examVerifyUrl }: { entry: TimelineEntry; examVerifyUrl?: string }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const feature = entry.feature;
  const month = monthOf(entry.date);

  return (
    <li>
      <p className="font-medium text-ink">
        {month && <span className="smallcaps mr-2 font-normal text-muted">{month}</span>}
        {entry.title}
      </p>
      <p className="text-ink">{entry.description}</p>
      {entry.flair && <p className="mt-1 italic text-muted">{entry.flair}</p>}

      {feature && (
        <>
          <button
            type="button"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen((value) => !value)}
            className="mt-1 inline-flex min-h-[44px] items-center text-base text-ink"
          >
            <span className="link">{FEATURE_LABEL[feature]}</span>
            <span aria-hidden="true" className="ml-2 text-accent">
              {open ? '−' : '+'}
            </span>
          </button>
          <div id={panelId} hidden={!open}>
            {open && (
              <div className="fade-in mb-2 mt-2">
                <FeaturePanel feature={feature} examVerifyUrl={examVerifyUrl} />
              </div>
            )}
          </div>
        </>
      )}
    </li>
  );
}

export default function InteractiveTimeline({ entries, examVerifyUrl }: InteractiveTimelineProps) {
  const groups = groupByYear(entries);

  return (
    <div className="space-y-10">
      {groups.map((group) => (
        <section key={group.year} aria-label={group.year}>
          <h3 className="text-center text-lg tracking-[0.18em] text-accent">{group.year}</h3>
          <ul className="mt-4 space-y-6" role="list">
            {group.entries.map((entry) => (
              <Entry key={`${entry.date}-${entry.title}`} entry={entry} examVerifyUrl={examVerifyUrl} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
