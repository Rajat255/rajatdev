/**
 * LinuxTerminal — the easter egg on the 2022 "Switched to Linux" entry.
 *
 * Types out `uptime && uname -a` and its output when it mounts (that is, when
 * the entry is unfolded). The uptime counts from the switch in 2022 to now.
 * Under reduced motion the whole transcript appears at once.
 */
import { useEffect, useState } from 'react';

/** The switch, as best as anyone remembers it. */
const SWITCH_DATE = Date.UTC(2022, 0, 1);
const COMMAND = 'uptime && uname -a';
const TYPE_INTERVAL_MS = 45;

function transcript(now: number): string[] {
  const days = Math.max(0, Math.floor((now - SWITCH_DATE) / 86_400_000));
  const clock = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'Asia/Kolkata',
  }).format(now);
  return [
    ` ${clock} up ${days.toLocaleString('en-US')} days,  1 user,  load average: 0.42, 0.38, 0.35`,
    'Linux daily-driver 6.11.0-generic #1 SMP PREEMPT_DYNAMIC x86_64 GNU/Linux',
    '',
    '# Windows: not found. Not missed.',
  ];
}

export default function LinuxTerminal() {
  const [typed, setTyped] = useState(0);
  const [output, setOutput] = useState<string[] | null>(null);

  useEffect(() => {
    const reduce =
      typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setTyped(COMMAND.length);
      setOutput(transcript(Date.now()));
      return;
    }
    let count = 0;
    const timer = setInterval(() => {
      count += 1;
      setTyped(count);
      if (count >= COMMAND.length) {
        clearInterval(timer);
        setOutput(transcript(Date.now()));
      }
    }, TYPE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      role="region"
      aria-label="Terminal"
      className="overflow-x-auto bg-[#161514] p-4 font-mono text-[0.75rem] leading-6 text-[#EAE4D7]"
    >
      <p className="whitespace-pre">
        <span className="text-[#D9534F]">rajat@daily-driver</span>:<span className="text-[#9A9284]">~</span>${' '}
        {COMMAND.slice(0, typed)}
        {output === null && <span aria-hidden="true" className="cursor-blink">▍</span>}
      </p>
      {output?.map((line, index) => (
        <p key={index} className={`whitespace-pre ${line.startsWith('#') ? 'text-[#9A9284]' : ''}`}>
          {line || ' '}
        </p>
      ))}
      {output && (
        <p className="whitespace-pre">
          <span className="text-[#D9534F]">rajat@daily-driver</span>:<span className="text-[#9A9284]">~</span>${' '}
          <span aria-hidden="true" className="cursor-blink">
            ▍
          </span>
        </p>
      )}
    </div>
  );
}
