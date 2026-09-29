# Phase 0 Research: Account-Wide Progress Sweep

## Background execution model on Vercel

**Decision**: Implement the population run as a resumable, chunked state
machine stored in Postgres (a `runs` row plus one `run_items` row per repo
in that run), advanced by repeated short invocations rather than one
long-lived request. Triggering a run (`POST /api/runs`) does the minimal
setup work (create the `runs` row, enumerate `run_items`) and returns
immediately; a Vercel Cron job (or, for a self-hoster not on Vercel, any
periodic invocation of the same endpoint) picks up the in-progress run on
each tick and processes as many not-yet-processed `run_items` as fit
inside one invocation's time budget, updating each repo's result as it
finishes, until none remain, then marks the run `completed`.

**Rationale**: Vercel serverless functions have a hard maximum duration;
sequentially processing up to ~100 repos, each needing a GitHub fetch plus
an LLM call, can plausibly exceed it well before the run is done. This
approach directly satisfies FR-010 (async trigger, incremental visibility)
using only infrastructure already in the chosen stack (Postgres + Vercel
Cron), with no new hosted dependency.

**Alternatives considered**:
- *A single long-running request* (e.g., a streaming response held open for
  the run's duration) — rejected: still bounded by the same function
  duration limit, and doesn't survive a client disconnect.
- *A third-party durable-execution service* (e.g., Inngest, Trigger.dev) —
  rejected for this feature: real capability, but adds an external
  dependency and account beyond what up to ~100 repos actually requires;
  revisit only if the chunked-cron approach proves insufficient at higher
  scale (out of the ~100-repo NFR-002 target).

**Cron cadence**: `vercel.json` schedules the tick once daily
(`0 0 * * *`), not the finer interval this design would ideally use —
Vercel's Hobby plan only permits daily-or-coarser cron schedules; anything
more frequent needs a paid plan. This means an in-progress run only
auto-advances via cron once a day; `POST /api/runs` and a direct call to
the advance route still process synchronously within that one request, so
triggering (or re-triggering) a run manually isn't affected — only the
"nothing calls it and it just sits" case waits up to a day. Revisit this
cadence if that latency becomes a real problem, or once a paid plan makes
a shorter interval available.

## Enforcing "only one run at a time" (FR-011)

**Decision**: A partial unique index on `runs (status) WHERE status =
'in_progress'` — the database itself refuses a second in-progress row,
rather than relying on an application-level check-then-insert that a race
between two near-simultaneous triggers could defeat.

**Rationale**: matches this project's engineering-practices.md lesson on
preferring a structural guarantee over a written/app-level one wherever a
real technical gate is available.

**Alternatives considered**: an app-level "check for an in-progress run,
then insert" — rejected: a real (if narrow) race window between the check
and the insert.

## Database / query layer

**Decision**: Drizzle ORM, connected via a Postgres connection string.
Neon is the Postgres *provider* used for the maintainer's own instance and
the public demo — not an architectural dependency of the app itself. For
the Neon-hosted deployment, Drizzle's `neon-http` adapter
(`@neondatabase/serverless` under the hood) is the driver, since it's an
HTTP-based client purpose-built for short-lived serverless functions —
a plain pooled TCP driver (`pg`) is a known bad fit for Vercel's
per-invocation connection churn. A self-hoster on a different Postgres
(or a self-hosted Neon-incompatible instance) swaps in Drizzle's
`node-postgres`/`postgres-js` adapter instead — a one-line change in
`lib/db/client.ts`, not a schema or query-code change, since Drizzle's
schema and query builder are driver-agnostic.

**Rationale**: keeps Constitution Principle I (self-hosted by default) and
NFR-005 (self-host packaging is a day-one concern) genuinely true rather
than aspirational — nothing in the app assumes Neon-specific APIs beyond
the swappable driver file. tool-notes.md's existing Drizzle lessons (from
the predecessor project) apply directly.

**Alternatives considered**:
- Supabase as the Postgres provider — reconsidered after research.md's
  first pass recommended it; rejected once its Branching feature (needed
  for the preview-environment pattern below) turned out to require the
  Pro plan, a real recurring cost the operator ruled out. Neon's
  equivalent branch-per-preview integration is free-tier compatible at
  this project's scale.
- A vendor-specific query client (e.g., `@supabase/supabase-js` over
  PostgREST) — rejected as the primary data-access layer regardless of
  provider: it would make data access genuinely vendor-specific, cutting
  against self-hosting with a different Postgres provider.

## LLM integration (Constitution Principle VII, NON-NEGOTIABLE)

**Decision**: The Vercel AI SDK's provider abstraction is the sole
integration point for generating an assessment (`lib/assessment/
provider.ts`). Which underlying provider/model is actually configured is
an operator-supplied setting (an environment variable), not a code-level
choice.

**Rationale**: the SDK is built specifically to make provider swapping a
config change; using it directly satisfies the non-negotiable principle
without inventing a bespoke abstraction layer. It also fits the already-
chosen Next.js/Vercel stack with no additional integration work.

**Alternatives considered**: a hand-rolled provider-interface wrapping
each vendor's own SDK directly — rejected: reinvents what the Vercel AI
SDK already provides, for no added benefit here.

## GitHub API access (Constitution Principle III, NON-NEGOTIABLE)

**Decision**: `@octokit/rest`, used only for read endpoints (repo listing,
commits, issues, pull requests, README contents). Rate-limit handling
(Edge Case: "GitHub API rate limits are hit mid-population-run") uses
Octokit's built-in rate-limit and retry plugins rather than bespoke
throttling logic.

**Rationale**: standard, well-maintained client with first-class
rate-limit awareness; using only its read surface makes "this code cannot
write to GitHub" straightforward to audit (Principle III is NON-NEGOTIABLE).

**Alternatives considered**: raw `fetch` calls against the GitHub REST API
— rejected: would mean reimplementing rate-limit/retry handling that
Octokit already provides correctly.

## CI/CD system

**Decision**: GitHub Actions, configured as a required status check
(branch protection) running the same quality-gate commands used locally.

**Rationale**: the repo is hosted on GitHub and `github.md`/`CLAUDE.md`
already require a required-check PR gate — GitHub Actions is the only
CI system that can serve as a native required-status-check for a
GitHub-hosted repo without introducing a separate third-party CI account.
tool-notes.md's existing GitHub Actions/GitHub Apps lessons (from the
predecessor project) apply directly.

**Alternatives considered**: none seriously — a third-party CI service
(CircleCI, Buildkite, etc.) would still need to report back to GitHub as a
status check to satisfy the branch-protection requirement, adding an extra
account/integration for no benefit over using GitHub Actions natively.

## Deployment automation and preview-environment database branching

**Decision**: Connect the GitHub repo to a Vercel project for automatic
Production/Preview Deployments (Vercel's default Git-integration
behavior — no bespoke deploy scripting), paired with Neon's Vercel-native
integration: on each Preview Deployment, Vercel sends a webhook to Neon,
which instantly creates a copy-on-write `preview/<git-branch>` database
branch (inheriting schema and data from its parent) and Vercel injects
that branch's `DATABASE_URL` into the deployment's environment variables.
The branch is deleted automatically when its Vercel deployment is removed.

**Rationale**: reproduces the pattern the operator already relied on
building repo-rater — a preview build that's safe to click through with
its own real (if fake) data, never touching production state — and does
so on Neon's free tier (10 branches/project, 100 CU-hours/month as of
2026), avoiding the Pro-plan cost that ruled out Supabase's equivalent
feature. It also gives the later credential-free-demo feature
(Constitution Principle VI) a concrete mechanism to seed fresh fake data
into an isolated branch, rather than inventing a seeding pipeline from
scratch when that feature starts. Because Drizzle talks to whatever
`DATABASE_URL` it's given (see "Database / query layer" above), a branched
preview database requires zero application-code changes — only the
connection string differs per environment.

**Alternatives considered**: Supabase Branching — the first pass at this
research recommended it, since the operator had initially named Supabase
as the Postgres provider; reconsidered and rejected once its Branching
feature turned out to require the Pro plan, a real recurring cost the
operator ruled out as a deal-breaker.

**To verify once implemented, not assumed**: confirm env-var propagation
timing actually holds up in practice for our setup (a general "trust but
verify" on any first-time provider integration) — the equivalent Supabase
integration had a documented race condition around this; no evidence
Neon's has the same issue, but it hasn't been exercised against this
project yet either.

## Quality-gate tooling

**Decision**: Vitest for unit/integration tests, `tsc --noEmit` for
type-checking, `next lint` (Next.js's built-in ESLint integration,
core-web-vitals ruleset) for linting, and Prettier for formatting — the
same four commands run locally and in CI.

**Rationale**: `next lint` bundles framework-specific rules (React hooks,
Next.js-specific pitfalls) that a more generic linter (e.g., Biome) doesn't
yet cover as completely for this framework; Vitest is already a known
quantity per tool-notes.md.

**Alternatives considered**: Biome (single faster tool covering both lint
and format) — considered, but its Next.js/React-specific rule coverage is
less mature than `eslint-plugin-next`'s; revisit if that gap closes.
