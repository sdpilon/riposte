# Implementation Plan: Account-Wide Progress Sweep

**Branch**: `001-account-progress-sweep` | **Date**: 2026-09-27 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-account-progress-sweep/spec.md`

## Summary

Discover every repo in the connected GitHub account, generate an
evidence-grounded completion estimate and status tier for each eligible one
via an LLM call, and make exclusions (fork/archived/no-README/no-activity)
visible with a specific reason. Runs execute asynchronously and
incrementally (Clarifications, 2026-09-27), with only one run active at a
time.

Technical approach: a single Next.js (App Router) app on Vercel, Postgres
(via Neon) as the only datastore, Drizzle as the query/migration layer,
Octokit for read-only GitHub access, and the Vercel AI SDK as the
provider-agnostic LLM integration point (Constitution Principle VII). The
population run is implemented as a resumable, chunked background process
driven by Vercel Cron rather than one long-lived request, since serverless
functions can't hold a request open for the duration of a ~100-repo sweep.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 22 LTS (Vercel's current
supported runtime)

**Primary Dependencies**: Next.js (App Router) + React, Tailwind CSS, Radix
UI primitives, Lucide icons, Drizzle ORM, Vercel AI SDK, Octokit
(`@octokit/rest`)

**Storage**: Postgres. Drizzle connects via a Postgres connection string, so
the specific provider (Neon for the maintainer's own instance and the
public demo; a self-hoster's own Postgres — Neon or otherwise) is a
deployment choice, not an application-code dependency — see research.md.

**Testing**: Vitest (unit/integration), `tsc --noEmit` (type-checking),
`next lint` (ESLint, core-web-vitals ruleset) + Prettier (lint/format) — the
same four commands CI runs, per this repo's quality-gate policy.

**CI/CD**: GitHub Actions, running the same four quality-gate commands as a
required status check on every PR (per this repo's branch-protection
policy and Constitution's "automated quality gate blocks every merge from
day one"). The natural, effectively only choice for a repo hosted on
GitHub with GitHub-enforced required checks — not a decision with real
alternatives to weigh.

**Deployment**: Vercel's native Git integration — automatic Production
Deployment on push to `main`, automatic Preview Deployment per PR/branch.
Paired with Neon's Vercel-native integration (free-tier compatible), which
auto-creates a copy-on-write `preview/<branch>` database branch per Preview
Deployment and injects its `DATABASE_URL` automatically. See research.md —
this is also the infrastructure the later credential-free-demo feature
(Constitution Principle VI) will build its fake-data seeding on top of, per
engineering-practices.md's "a demo environment's data should refresh
itself on deploy" lesson.

**Target Platform**: Vercel (Node.js serverless functions + Vercel Cron) as
the maintainer's own deployment and the public demo's host. The app itself
assumes only "a Node.js host that can run Next.js and reach a Postgres
connection string" — Vercel is a hosting choice, not a hard requirement for
every self-hoster.

**Project Type**: Web application — a single Next.js app combining frontend
(App Router pages) and backend (Route Handlers); not a separate
frontend/backend split.

**Performance Goals**: A population run across ~100 repos makes visible,
incremental progress rather than blocking any single request for its full
duration (FR-010). The dashboard listing renders interactively for up to
~100 rows with no perceptible lag.

**Constraints**: Each serverless invocation must complete within Vercel's
function duration limit, so the population run is a resumable, chunked
state machine (see research.md), not one long-running request. No code path
may assume a specific LLM vendor (Constitution Principle VII, NON-NEGOTIABLE).
No code path may perform a write/mutating call against GitHub (Constitution
Principle III, NON-NEGOTIABLE).

**Scale/Scope**: Up to ~100 tracked repos per account (PRD NFR-002); single
account, single operator per instance (Constitution Principle I).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design
below.*

| Principle | Status | Notes |
|---|---|---|
| I. Self-Hosted, Single-User by Default | PASS | One Postgres connection string + one deployment per operator; no multi-tenant schema anywhere in data-model.md. |
| II. Evidence-Grounded Assessments | PASS | FR-004/FR-005 require every assessment to cite real activity; `assessments.evidence_refs` makes this a stored, checkable field, not a convention. |
| III. Read-Only Against GitHub (NON-NEGOTIABLE) | PASS | Octokit usage scoped to read endpoints only (`lib/github/client.ts`); no mutating call is in scope anywhere in this plan. |
| IV. Minimal Setup Friction, Smart Defaults | PASS | Auto-discovery + auto-exclusion (FR-001/FR-002) need no per-repo setup before first use. |
| V. Cheap, Automatic Re-Assessment | PASS | FR-006's change-detection (an `inputs_fingerprint` comparison) gates every LLM call. |
| VI. Credential-Free Demo Is First-Class | DEFERRED (non-blocking) | This feature builds the assessment engine, not the demo-seeding path — that's a later, separate feature. Nothing here precludes it; the schema has no field that assumes a real GitHub account. |
| VII. No LLM Provider Lock-In (NON-NEGOTIABLE) | PASS | Vercel AI SDK's provider abstraction is the only integration point for LLM calls; swapping providers is a config change, not a code change. |
| VIII. Credentials Belong to the Operator (NON-NEGOTIABLE) | PASS | GitHub token, LLM API key, and Postgres connection string are all supplied as operator-provided configuration; nothing here introduces account-held credential storage. |

No violations requiring justification — Complexity Tracking is empty.

**Post-Design Re-Check** (after Phase 1 — research.md, data-model.md,
contracts/): unchanged. `data-model.md` introduces no multi-tenant fields
(Principle I), `assessments.evidence_refs` makes Principle II checkable
rather than aspirational, and `contracts/runs-api.md` exposes no
GitHub-mutating endpoint (Principle III). Gate still passes.

**Development Practices note** (constitution, non-principle section): the
task list generated next (`speckit-tasks`) must front-load, as one of its
first phases (before or alongside this feature's own implementation
tasks, not after):
- the CI workflow and quality gate (type-check, lint, format, test), per
  "branch-protected trunk with CI-required PRs from day one"; and
- linking the Vercel project to this GitHub repo and installing Neon's
  Vercel-native integration, so preview deployments already have isolated
  database branches by the time real feature code lands, not retrofitted
  once previews already depend on a shared database.

## Project Structure

### Documentation (this feature)

```text
specs/001-account-progress-sweep/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md         # Phase 1 output
├── quickstart.md         # Phase 1 output
├── contracts/            # Phase 1 output
│   └── runs-api.md
└── tasks.md              # Phase 2 output (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
app/
├── (dashboard)/
│   └── page.tsx              # repo listing: status tier, completion estimate, exclusion reason
├── api/
│   └── runs/
│       ├── route.ts          # POST: trigger a population run (FR-010, FR-011)
│       └── [runId]/route.ts  # GET: run status/progress
└── layout.tsx

lib/
├── db/
│   ├── schema.ts              # Drizzle schema: tracked repos, activity, assessments, runs, run_items
│   ├── client.ts               # Drizzle client, wired to a Postgres connection string
│   └── migrations/
├── github/
│   └── client.ts                # Octokit wrapper; read-only calls only; rate-limit handling
├── assessment/
│   ├── provider.ts               # Vercel AI SDK call: evidence-grounded verdict + tier + estimate
│   └── change-detection.ts       # FR-006: inputs_fingerprint comparison
└── runs/
    └── runner.ts                  # chunked/resumable run state machine (FR-010, FR-011)

components/
└── repo-list/                     # dashboard listing UI

tests/
├── unit/
├── integration/
└── contract/                       # route-handler contract tests (see contracts/runs-api.md)

.github/workflows/
└── ci.yml                          # required check: typecheck, lint, format check, test
```

**Structure Decision**: single Next.js app (App Router) combining frontend
and backend Route Handlers in one deployable — matches "Project Type: web
application" above. The template's Option 2 (separate `frontend/`+`backend/`
trees) doesn't apply here since Next.js Route Handlers already colocate
both without a physical split.

## Complexity Tracking

*No entries — Constitution Check above has no unjustified violations.*
