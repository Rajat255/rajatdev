import { z } from 'zod';

import { experience } from './experience';

/**
 * Case studies: the bigger production projects, each written up once and in
 * full, nested under the employer they were done for on the builds page.
 *
 * Source of truth for every figure here is `resume/main.tex`. If a number
 * changes there, change it here.
 *
 * EDIT THIS FILE to add a case study. `company` must match a `company` in
 * `src/data/experience.ts`; a mismatch fails the build.
 */

export const CaseMetric = z.object({
  /** The figure itself, e.g. "$200K/yr". */
  value: z.string().min(1).max(16),
  label: z.string().min(1).max(60),
});
export type CaseMetric = z.infer<typeof CaseMetric>;

export const CaseFile = z.object({
  company: z.string().min(1),
  title: z.string().min(1),
  year: z.number().int().min(2000).max(2100),
  /** One line, shown while the case study is closed. */
  summary: z.string().min(20).max(220),
  /** What things looked like before. */
  before: z.string().min(20).max(500),
  /** What changed in the architecture, one move per item. */
  changes: z.array(z.string().min(1)).min(1),
  metrics: z.array(CaseMetric).min(1).max(6),
  stack: z.array(z.string().min(1)).min(1),
});
export type CaseFile = z.infer<typeof CaseFile>;

export const CaseFiles = z
  .array(CaseFile)
  .min(1)
  .refine(
    (list) => new Set(list.map((c) => c.title)).size === list.length,
    'case study titles must be unique',
  );
export type CaseFiles = z.infer<typeof CaseFiles>;

export const caseFiles: CaseFiles = CaseFiles.parse([
  {
    company: 'amber',
    title: 'ECS to EKS migration',
    year: 2026,
    summary:
      'Moving 50+ services from ECS and EC2 onto EKS, with just-in-time nodes and a zero-downtime cutover.',
    before:
      '50+ containerized and non-containerized services were split between AWS ECS and hand-managed EC2. Scaling followed CPU and memory, which lagged behind the queue-driven load many of those services actually had.',
    changes: [
      'Stood up EKS with managed node groups, IRSA-based pod identity, and VPC CNI networking.',
      'Karpenter provisions On-Demand and Spot node pools just in time, with SQS-driven interruption handling.',
      'KEDA scales event-driven workloads on queue depth where CPU/memory HPA fell short.',
      'Cut over blue-green, shifting traffic behind the AWS Load Balancer Controller.',
    ],
    metrics: [
      { value: '50+', label: 'services migrated to EKS' },
      { value: '0', label: 'minutes of customer-facing downtime' },
    ],
    stack: ['Amazon EKS', 'ECS', 'Karpenter', 'KEDA', 'Terraform', 'Helm', 'Docker', 'AWS LB Controller'],
  },
  {
    company: 'amber',
    title: 'AWS cost optimization',
    year: 2025,
    summary:
      'A company-wide programme over two and a half months that cut monthly AWS spend by 45%, roughly $200K a year.',
    before:
      'Monthly AWS spend sat at $35–38K. Aurora ran Serverless, Redshift dc2.large nodes tied 2 TB of storage to compute, Fargate ran everything On-Demand, 14 Application Load Balancers each fronted a handful of services, and SQS consumers short-polled empty queues.',
    changes: [
      'Data tier: Aurora Serverless to provisioned r7g Graviton; Redis re-platformed to Valkey on Graviton; Redshift dc2.large to RA3, decoupling 2 TB of storage from compute; heavy Athena scans rerouted to a right-sized database.',
      'Compute: ECS Fargate to EC2 Graviton, with Spot for fault-tolerant jobs, and self-hosted CI runners.',
      'Networking: 14 ALBs consolidated to 4; SQS consumers moved to long-polling.',
      'Commitments last: Compute Savings Plans layered on once capacity was predictable.',
    ],
    metrics: [
      { value: '−45%', label: 'monthly AWS spend' },
      { value: '$200K/yr', label: 'saved ($35–38K → $19–21K a month)' },
      { value: '14 → 4', label: 'Application Load Balancers' },
      { value: '−90%', label: 'SQS costs, via long-polling' },
      { value: '0', label: 'impact on availability' },
    ],
    stack: ['Graviton', 'Spot', 'Savings Plans', 'Aurora', 'Redshift RA3', 'Valkey', 'Cost Explorer'],
  },
  {
    company: 'amber',
    title: 'Agentic CI/CD failure triage',
    year: 2026,
    summary:
      'A Kubernetes-native agent that reads failed builds, works out the root cause, and fixes or retries 40% of them on its own.',
    before:
      '30+ pipelines across Jenkins and Argo Workflows served 40 services. Every red build meant a person opening the job, scrolling the log, and deciding whether it was real or just flaky.',
    changes: [
      'An LLM layer parses job logs, classifies each failure by root cause, and posts a Slack summary with the recommended fix.',
      'Closed-loop remediation opens targeted GitHub pull requests for code and config defects, and retries transient failures through a Jenkins MCP server.',
      'The same agent reviews Terraform and Helm pull requests against Well-Architected, security, and cost guardrails, and runs scheduled drift and hygiene audits.',
      'Alert-driven self-healing (rollbacks, restarts, scaling, cordon/drain) runs behind Slack approval gates for high-risk actions, with a full audit log, shipped as an RBAC-scoped Helm chart.',
    ],
    metrics: [
      { value: '40%', label: 'of failures resolved hands-free' },
      { value: '−70%', label: 'mean triage time' },
      { value: '8+ h/wk', label: 'of engineering time returned' },
      { value: '30+', label: 'pipelines watched' },
    ],
    stack: ['Python', 'LLM Agents', 'MCP', 'Jenkins', 'Argo Workflows', 'Helm', 'Slack'],
  },
]);

// Every case study must belong to a role on the builds page, or it would never render.
const knownCompanies = new Set(experience.map((role) => role.company));
for (const file of caseFiles) {
  if (!knownCompanies.has(file.company)) {
    throw new Error(`Case study "${file.title}" names unknown company "${file.company}".`);
  }
}

/** Case studies for one employer, in authored order. */
export function caseFilesFor(company: string, list: CaseFiles = caseFiles): CaseFiles {
  return list.filter((file) => file.company === company);
}
