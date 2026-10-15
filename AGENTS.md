# AGENTS.md

## Stack and entrypoints

- Next.js 16 App Router on Node 22, pnpm 12; alias `@/*` → repo root
  (`tsconfig.json`).
- Dashboard read path: `app/(dashboard)/page.tsx` server component queries
  `tracked_repos` + latest `assessments`.
- Run API: `app/api/runs/route.ts` (trigger), `app/api/runs/[runId]/route.ts`
  (status), `app/api/runs/advance/route.ts` (Vercel cron chunk).
- DB: Drizzle ORM over Neon serverless HTTP; schema in `lib/db/schema.ts`,
  migrations in `lib/db/migrations/`.

## Commands

```bash
pnpm install
# set DATABASE_URL, GITHUB_TOKEN, LLM_PROVIDER, LLM_MODEL, LLM_API_KEY
cp .env.example .env.local
pnpm db:migrate
pnpm dev                            # http://localhost:3000
```

Quality gate (same as CI, run in this order):

```bash
pnpm check   # = pnpm typecheck && pnpm lint && pnpm format:check && pnpm test
```

After editing any file, run `pnpm exec prettier --write <path>` (or
`pnpm format`) immediately so formatting is automatic, never a later cleanup.
Confirm `pnpm check` is green before opening any PR; the same checks run in
GitHub Actions on every PR. Husky formalizes this: pre-commit formats staged
files via lint-staged, pre-push runs `pnpm check`, and CI runs `pnpm verify`
(set to equal `pnpm check` now; will include Playwright e2e when it lands).
`--no-verify` bypasses locally, but CI remains the backstop.

Single test:

```bash
pnpm test tests/unit/change-detection.test.ts
pnpm test -- -t "FR-006"            # filter by test name
```

DB helpers: `pnpm db:generate` (schema changes → migration), `pnpm db:migrate`
(apply).

## Architecture notes

- GitHub access is read-only by design (`lib/github/client.ts`); no write
  methods exist.
- LLM provider selection happens only in `lib/assessment/provider.ts`; other
  code must not branch on vendor.
- `lib/db/client.ts` is lazy: importing it does not require `DATABASE_URL`; only
  running a query does.
- A run is chunked: `POST /api/runs` inserts a queued run; Vercel cron
  (`vercel.json`) and `advanceRun` process≤25 repos in ≤8s.
- Discovery/listing happens in one pass and is not resumable; assume rate limits
  can kill a first tick.
- Assessments are insert-only; “current” assessment is newest `created_at`.
- Evidence IDs must resolve to stored `activity_records` rows or the assessment
  is rejected (FR-005).
- Note: `classifyRepo` treats `hasAnyActivity` as “ever”, so
  quiet-but-once-active repos are included and can be “stalled”.

## Common mistakes

- Spec 002 (sortable, freshness/staleness listing) is specified but not
  implemented; dashboard still orders by owner/name and has no sort/freshness
  UI.
- CI has a non-blocking `compliance-audit` job that runs
  `bash .github/scripts/policy-audit.sh`, which is intentionally absent right
  now; the step fails but does not fail the job.
- `prettier` ignores `.claude/`, `.specify/`, `.opencode/`, and `specs/`;
  Markdown in the tracked root and docs/ is format-checked. Run `pnpm format`
  after docs-heavy changes.
- Real end-to-end runs need env vars and a live Postgres DB; unit tests mock the
  DB and need none.

## Where process docs live

- `CLAUDE.md` (agent-operational), `CONTRIBUTING.md` (human narrative), `/docs`
  (PRD, engineering practices, tool notes). Read `.policy/README.md` before
  editing process rules.
