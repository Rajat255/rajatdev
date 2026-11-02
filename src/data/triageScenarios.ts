/**
 * Scenarios for the build-triage agent simulator on the front page.
 *
 * Plain typed data rather than a Zod-validated module: the TinkeringLab island
 * imports this directly, and Zod would otherwise ship to the browser.
 *
 * Each scenario follows the four steps the real agent takes (log in, tool calls,
 * classification, action). Failure classes and actions mirror what the agent
 * does in production (see the triage case file); service names, values, and
 * timings are illustrative.
 */

export type TriageClass = 'Deterministic' | 'Transient';

export interface ToolCall {
  /** The MCP tool invocation, printed as code. */
  readonly call: string;
  /** What came back, one line per finding. */
  readonly result: readonly string[];
}

export interface DiffLine {
  readonly kind: 'context' | 'add' | 'remove';
  readonly text: string;
}

export type TriageAction =
  | {
      readonly kind: 'pull-request';
      readonly title: string;
      readonly file: string;
      readonly diff: readonly DiffLine[];
      readonly note: string;
    }
  | {
      readonly kind: 'slack-approval';
      readonly channel: string;
      readonly message: readonly string[];
      readonly buttons: readonly string[];
      readonly note: string;
    }
  | {
      readonly kind: 'retry';
      readonly log: readonly string[];
      readonly channel: string;
      readonly message: readonly string[];
      readonly note: string;
    };

export interface TriageScenario {
  readonly id: string;
  readonly title: string;
  /** Where it broke, e.g. "Argo Workflows · nightly-reports". */
  readonly pipeline: string;
  readonly log: readonly string[];
  readonly toolCalls: readonly ToolCall[];
  readonly classification: {
    readonly kind: TriageClass;
    readonly confidence: number;
    readonly reason: string;
  };
  readonly action: TriageAction;
  /** Printed under the trace once the run completes. */
  readonly outcome: {
    readonly elapsed: string;
    readonly humansPaged: number;
    readonly verdict: string;
  };
}

export const triageScenarios: readonly TriageScenario[] = [
  {
    id: 'oomkilled',
    title: 'OOMKilled in an EKS worker',
    pipeline: 'Argo Workflows · invoice-renderer deploy',
    log: [
      '[argo] step render-smoke-test  phase=Failed',
      'pod/invoice-renderer-7c9f6d-x2kq  Back-off restarting failed container',
      'State: Terminated   Reason: OOMKilled   Exit Code: 137',
      'Last State: Terminated (3 restarts in 4m12s)',
      'container memory limit: 512Mi',
    ],
    toolCalls: [
      {
        call: 'k8s.describe_pod(ns="billing", pod="invoice-renderer-7c9f6d-x2kq")',
        result: ['limits.memory = 512Mi, requests.memory = 384Mi', 'peak working set before kill: 611Mi'],
      },
      {
        call: 'git.log(path="services/invoice-renderer", since="7d")',
        result: ['a41e9c2  "add PDF watermarking to invoices" (2 days ago)', 'Helm values last touched 8 months ago'],
      },
    ],
    classification: {
      kind: 'Deterministic',
      confidence: 0.94,
      reason:
        'A new feature raised peak memory past a limit nobody revisited. It will fail every time until the limit changes.',
    },
    action: {
      kind: 'pull-request',
      title: 'fix(invoice-renderer): raise memory to fit PDF watermarking',
      file: 'charts/invoice-renderer/values.yaml',
      diff: [
        { kind: 'context', text: 'resources:' },
        { kind: 'context', text: '  requests:' },
        { kind: 'remove', text: '    memory: 384Mi' },
        { kind: 'add', text: '    memory: 640Mi' },
        { kind: 'context', text: '  limits:' },
        { kind: 'remove', text: '    memory: 512Mi' },
        { kind: 'add', text: '    memory: 768Mi' },
      ],
      note: 'Pull request opened with the log excerpt and peak-memory graph attached. Owner tagged for review.',
    },
    outcome: { elapsed: '38s', humansPaged: 0, verdict: 'Fix proposed as a pull request' },
  },
  {
    id: 'terraform-drift',
    title: 'Terraform state lock & IAM drift',
    pipeline: 'Jenkins · infra-apply-prod #412',
    log: [
      'Error: Error acquiring the state lock',
      'ConditionalCheckFailedException: The conditional request failed',
      'Lock Info:  ID: 6f1c2b90-…  Operation: OperationTypeApply',
      '            Who: jenkins@agent-spot-7   Created: 3h 04m ago',
      'Error: AccessDenied: ci-deployer is not authorized to perform: iam:PassRole',
    ],
    toolCalls: [
      {
        call: 'jenkins.get_build(job="infra-apply-prod", build=409)',
        result: ['status = ABORTED 3h ago', 'agent-spot-7 reclaimed by a Spot interruption mid-apply'],
      },
      {
        call: 'aws.cloudtrail.lookup_events(resource="role/ci-deployer", since="24h")',
        result: ['DetachRolePolicy by a console session at 11:42', 'change not present in Terraform'],
      },
    ],
    classification: {
      kind: 'Deterministic',
      confidence: 0.88,
      reason:
        'Two faults: an orphaned lock from an evicted runner, and an out-of-band IAM change. Retrying would fail the same way.',
    },
    action: {
      kind: 'slack-approval',
      channel: '#infra-alerts',
      message: [
        'infra-apply-prod is blocked. Lock 6f1c2b90 belongs to build #409, which died with its Spot node.',
        'ci-deployer lost iam:PassRole through a console edit at 11:42 (drift from Terraform).',
        'Proposed: force-unlock 6f1c2b90, re-apply ci-deployer policy from code, re-run #412.',
      ],
      buttons: ['Approve', 'Hold'],
      note: 'Force-unlock and IAM changes are high-risk, so the agent asks first. Nothing ran until someone tapped Approve.',
    },
    outcome: { elapsed: '52s', humansPaged: 1, verdict: 'Remediation queued behind an approval gate' },
  },
  {
    id: 'flaky-test',
    title: 'Flaky integration test in Argo',
    pipeline: 'Argo Workflows · checkout-service CI',
    log: [
      '[argo] step integration-tests  phase=Failed  attempt=1',
      'FAIL  tests/checkout.int.ts > applies coupon to basket',
      'Error: connect ECONNREFUSED 10.0.42.17:5432',
      '  at TCPConnectWrap.afterConnect [as oncomplete]',
      'Tests: 1 failed, 213 passed',
    ],
    toolCalls: [
      {
        call: 'argo.get_history(workflow="checkout-ci", test="applies coupon", runs=50)',
        result: ['failed 3 of the last 50 runs, always on attempt 1', 'same commit passed 2 hours earlier'],
      },
      {
        call: 'k8s.get_events(ns="ci-ephemeral", object="postgres-0")',
        result: ['readiness probe passed 2.1s after the test step started'],
      },
    ],
    classification: {
      kind: 'Transient',
      confidence: 0.91,
      reason:
        'A race between the test starting and its throwaway database becoming ready. The code is fine; the timing is not.',
    },
    action: {
      kind: 'retry',
      log: ['→ argo.retry_step(workflow="checkout-ci", step="integration-tests")', '✓ integration-tests  phase=Succeeded  attempt=2  (214 passed)'],
      channel: '#ci-checkout',
      message: [
        'Retried integration-tests: passed on attempt 2.',
        'Flake source: tests start before postgres-0 is ready (3/50 runs). Suggest a readiness wait in the test fixture.',
      ],
      note: 'Retried through MCP, then a summary to the team channel so the flake gets fixed properly later.',
    },
    outcome: { elapsed: '1m 06s', humansPaged: 0, verdict: 'Retried and green' },
  },
];
