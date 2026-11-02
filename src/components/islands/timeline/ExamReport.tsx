/**
 * ExamReport — notes on the SAP-C02 exam, unfolded from the timeline.
 */

interface ExamReportProps {
  /** Credential verification URL, when there is one. */
  readonly verifyUrl?: string;
}

const FACTS = [
  { label: 'Length', value: '3 hours' },
  { label: 'Questions', value: '75 long scenario questions, every answer plausible' },
  { label: 'Survived', value: 'VPC design and multi-account Transit Gateway' },
] as const;

export default function ExamReport({ verifyUrl }: ExamReportProps) {
  return (
    <div className="border-l-2 border-accent pl-5">
      <dl className="space-y-1">
        {FACTS.map((fact) => (
          <div key={fact.label} className="grid grid-cols-[6.5rem_1fr] gap-3">
            <dt className="smallcaps pt-px text-muted">{fact.label}</dt>
            <dd className="text-ink">{fact.value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 italic text-muted">
        The trick isn&rsquo;t knowing every service. It&rsquo;s spotting which of four reasonable architectures is the
        cheapest one that still meets every requirement.
      </p>
      {verifyUrl && (
        <a href={verifyUrl} target="_blank" rel="noopener noreferrer" className="link mt-2 inline-block text-base text-ink">
          Verify on Credly
        </a>
      )}
    </div>
  );
}
