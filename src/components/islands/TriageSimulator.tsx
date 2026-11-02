/**
 * TriageSimulator — break a pipeline, then watch the triage agent work it out
 * (React island, on /builds).
 *
 * Pick one of three failure scenarios and press the button. The agent's four
 * steps appear one at a time: the log it ingested, the MCP tool calls it made,
 * how it classified the root cause, and what it did about it.
 *
 * The step-by-step reveal is sequencing, not decoration, so it also runs under
 * reduced motion; only the fade is dropped (by the global reduced-motion rule).
 * A polite live region announces each step.
 *
 * Logs, tool calls, and diffs are real code-like text, so they are set in
 * <pre> blocks; everything else is the page's serif.
 */
import { useEffect, useId, useState } from 'react';

import { triageScenarios, type TriageAction, type TriageScenario } from '../../data/triageScenarios';

const STEP_LABELS = ['Log ingested', 'MCP tool calls', 'Root cause classified', 'Automated action'] as const;
const STEP_COUNT = STEP_LABELS.length;
const STEP_DELAY_MS = 1_150;

const preClass =
  'overflow-x-auto bg-surface px-4 py-3 font-mono text-[0.75rem] leading-6 text-ink';

function ChatMessage({ channel, lines }: { channel: string; lines: readonly string[] }) {
  return (
    <blockquote className="border-l-2 border-accent pl-4">
      <p className="smallcaps text-muted">{channel} · triage-agent</p>
      {lines.map((line) => (
        <p key={line} className="mt-1 text-ink">
          {line}
        </p>
      ))}
    </blockquote>
  );
}

function ActionView({ action }: { action: TriageAction }) {
  switch (action.kind) {
    case 'pull-request':
      return (
        <div className="space-y-2">
          <p className="text-ink">
            Opened a pull request: <span className="italic">{action.title}</span>
          </p>
          <pre className={preClass} aria-label={`Diff of ${action.file}`}>
            <span className="block text-muted">{action.file}</span>
            {action.diff.map((line, index) => (
              <span
                key={index}
                className={`block ${
                  line.kind === 'add' ? 'text-ink' : line.kind === 'remove' ? 'text-accent' : 'text-muted'
                }`}
              >
                {line.kind === 'add' ? '+ ' : line.kind === 'remove' ? '- ' : '  '}
                {line.text}
              </span>
            ))}
          </pre>
          <p className="italic text-muted">{action.note}</p>
        </div>
      );
    case 'slack-approval':
      return (
        <div className="space-y-3">
          <ChatMessage channel={action.channel} lines={action.message} />
          <p className="text-muted">
            Buttons offered: {action.buttons.join(' or ')}.
          </p>
          <p className="italic text-muted">{action.note}</p>
        </div>
      );
    case 'retry':
      return (
        <div className="space-y-3">
          <pre className={preClass}>{action.log.join('\n')}</pre>
          <ChatMessage channel={action.channel} lines={action.message} />
          <p className="italic text-muted">{action.note}</p>
        </div>
      );
  }
}

function StepBody({ step, scenario }: { step: number; scenario: TriageScenario }) {
  if (step === 0) {
    return (
      <div className="space-y-2">
        <p className="text-muted">{scenario.pipeline}</p>
        <pre className={preClass}>{scenario.log.join('\n')}</pre>
      </div>
    );
  }

  if (step === 1) {
    return (
      <pre className={preClass}>
        {scenario.toolCalls
          .map((tool) => [`→ ${tool.call}`, ...tool.result.map((line) => `  ← ${line}`)].join('\n'))
          .join('\n\n')}
      </pre>
    );
  }

  if (step === 2) {
    const { kind, confidence, reason } = scenario.classification;
    return (
      <p className="text-ink">
        <span className="font-semibold text-accent">{kind}</span>
        <span className="text-muted">, {Math.round(confidence * 100)}% confident. </span>
        {reason}
      </p>
    );
  }

  return <ActionView action={scenario.action} />;
}

export default function TriageSimulator() {
  const firstScenario = triageScenarios[0];
  const [scenarioId, setScenarioId] = useState<string>(firstScenario?.id ?? '');
  /** How many steps are visible: 0 before a run, STEP_COUNT when finished. */
  const [revealed, setRevealed] = useState(0);
  const [running, setRunning] = useState(false);
  const groupName = useId();

  const scenario = triageScenarios.find((s) => s.id === scenarioId) ?? firstScenario;

  // Advance one step at a time while a run is in progress.
  useEffect(() => {
    if (!running) return;
    if (revealed >= STEP_COUNT) {
      setRunning(false);
      return;
    }
    const timer = setTimeout(() => setRevealed((count) => count + 1), STEP_DELAY_MS);
    return () => clearTimeout(timer);
  }, [running, revealed]);

  if (!scenario) return null;

  const start = () => {
    setRevealed(1);
    setRunning(true);
  };

  const choose = (id: string) => {
    setScenarioId(id);
    setRevealed(0);
    setRunning(false);
  };

  const finished = revealed >= STEP_COUNT;
  const announcement =
    revealed === 0
      ? ''
      : finished
        ? `Done. ${scenario.outcome.verdict}. Humans paged: ${scenario.outcome.humansPaged}.`
        : `Step ${revealed} of ${STEP_COUNT}: ${STEP_LABELS[revealed - 1] ?? ''}.`;

  return (
    <div>
      <fieldset>
        <legend className="text-muted">Choose a failure:</legend>
        <ul className="mt-2 space-y-1" role="list">
          {triageScenarios.map((option) => (
            <li key={option.id}>
              <label className="group inline-flex min-h-[44px] cursor-pointer items-baseline gap-3 py-1">
                <input
                  type="radio"
                  name={groupName}
                  value={option.id}
                  checked={option.id === scenario.id}
                  onChange={() => choose(option.id)}
                  className="h-3.5 w-3.5 translate-y-[0.1em] accent-[rgb(var(--accent))]"
                />
                <span>
                  <span className="text-ink group-has-[:checked]:text-accent">{option.title}</span>
                  <span className="block text-base text-muted">{option.pipeline}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      </fieldset>

      <button
        type="button"
        onClick={start}
        disabled={running}
        className="mt-4 min-h-[44px] border border-ink px-5 font-semibold text-ink transition-colors hover:bg-ink hover:text-paper disabled:cursor-progress disabled:opacity-60"
      >
        {running ? 'The agent is working…' : finished ? 'Run it again' : 'Simulate pipeline failure'}
      </button>

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      {revealed > 0 && (
        <ol className="mt-8 space-y-7" role="list">
          {STEP_LABELS.slice(0, revealed).map((label, index) => (
            <li key={`${scenario.id}-${label}`} className="fade-in">
              <h3 className="smallcaps text-accent">
                <span className="sr-only">Step {index + 1}: </span>
                {label}
              </h3>
              <div className="mt-2">
                <StepBody step={index} scenario={scenario} />
              </div>
            </li>
          ))}
        </ol>
      )}

      {running && !finished && (
        <p aria-hidden="true" className="mt-4 italic text-muted">
          Reading the next clue…
        </p>
      )}

      {finished && (
        <p className="fade-in mt-6 border-t border-rule pt-4 text-ink">
          {scenario.outcome.verdict} in {scenario.outcome.elapsed}.{' '}
          {scenario.outcome.humansPaged === 0
            ? 'Nobody was paged.'
            : `${scenario.outcome.humansPaged} person was asked to approve.`}
        </p>
      )}

      <p className="mt-6 text-base italic text-muted">
        A simulation. The failure classes and the agent&rsquo;s moves match the real thing; the service names and
        numbers are made up.
      </p>
    </div>
  );
}
