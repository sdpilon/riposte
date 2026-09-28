---

description: "Task list for Account-Wide Progress Sweep"
---

# Tasks: Account-Wide Progress Sweep

**Input**: Design documents from `/specs/001-account-progress-sweep/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/runs-api.md, quickstart.md

**Tests**: Included — the constitution's Development Practices commit to
an automated quality gate (including tests) from day one, so this isn't
treated as optional for this project.

**Organization**: Tasks are grouped by user story (spec.md: US1 = P1
"populate real assessments", US2 = P1 "understand why a repo isn't
assessed") to enable independent implementation and testing of each.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2)
- Exact file paths are per plan.md's Project Structure

## ⚠️ Before starting Phase 1

This is the first *real application code* in this repo. Per `CLAUDE.md`'s
"Current phase" section:

1. Create a worktree for this feature first (`git.md`: "any change destined
   for a branch and a PR gets its own worktree").
2. The commit that lands T001 must **also** perform `CLAUDE.md`'s
   docs-only-phase self-deletion checklist (delete the "Current phase"
   section; drop the GitHub-heading qualifier; update `.policy/github.md`
   and `CONTRIBUTING.md` per that section's own listed steps) — not a
   follow-up commit, the same one.
3. From that point on, `github.md`'s PR-required rule is unconditional:
   every commit in this feature, including T001 itself, goes through a PR
   once CI (T007) exists to gate it.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, tooling, and deployment plumbing —
all of it front-loaded per plan.md's Development Practices note, so CI and
preview infrastructure exist before the feature's own code does.

- [ ] T001 Initialize the Next.js (App Router, TypeScript) project scaffold per plan.md's Project Structure (`app/layout.tsx`, `package.json`, `tsconfig.json`, `next.config.*`), using pnpm
- [ ] T002 [P] Install and configure Tailwind CSS, Radix UI primitives, and Lucide icons (`tailwind.config.ts`, `app/globals.css`)
- [ ] T003 [P] Configure ESLint (`next lint`, core-web-vitals ruleset) and Prettier (`eslint.config.mjs`, `.prettierrc`)
- [ ] T004 [P] Configure Vitest for unit/integration tests (`vitest.config.ts`)
- [ ] T005 [P] Configure Drizzle ORM + drizzle-kit against a Postgres connection string, using the `neon-http` adapter (research.md's "Database / query layer") in `lib/db/client.ts`, `drizzle.config.ts`
- [ ] T006 Add `.env.example` documenting `DATABASE_URL`, `GITHUB_TOKEN`, and the configured LLM provider's API key (quickstart.md's Prerequisites)
- [ ] T007 Add `.github/workflows/ci.yml` running `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test` as a required status check (constitution: "automated quality gate blocks every merge from day one")
- [ ] T008 Run `vercel link` + `vercel git connect` to connect this GitHub repo to the Vercel project (automatic Production/Preview Deployments), then `vercel integration add neon` to provision a Neon Postgres resource and connect it across `production`/`preview`/`development` (auto-syncs env vars via `vercel env pull`) — fully CLI-scriptable, no dashboard required for this step; branch-per-preview-deployment specifically is unconfirmed as automatic-by-default vs. requiring one dashboard toggle (see T026)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core data model and read-only GitHub access that both user
stories depend on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T009 Define the Drizzle schema for `tracked_repos`, `activity_records`, `assessments`, `runs`, `run_items` per data-model.md — including `tracked_repos.inclusion_state` (enum `included`/`excluded`), `tracked_repos.exclusion_reason` (nullable text, one of `fork`/`archived`/`no_readme`/`no_activity`, required non-null when excluded), `activity_records`' unique `(repo_id, kind, external_id)`, `assessments.evidence_refs` (`activity_records.id[]`), `assessments.inputs_fingerprint`, and the partial unique index on `runs(status) WHERE status = 'in_progress'` (FR-011) — file: `lib/db/schema.ts`
- [ ] T010 Generate and apply the initial Drizzle migration for the schema above — `lib/db/migrations/`
- [ ] T011 [P] Implement a read-only Octokit wrapper — repo listing, commits, issues, pull requests, README contents only, with rate-limit/retry handling (Constitution Principle III, NON-NEGOTIABLE: no mutating call anywhere in this module) — file: `lib/github/client.ts`
- [ ] T012 [P] Implement environment/config loading for `DATABASE_URL`, `GITHUB_TOKEN`, and the LLM provider setting — file: `lib/config/env.ts`

**Checkpoint**: Foundation ready — User Story 1 can now begin.

---

## Phase 3: User Story 1 - Populate the account with real assessments (Priority: P1) 🎯 MVP

**Goal**: A population run discovers every repo, generates an
evidence-grounded completion estimate and status tier for each eligible
one, and keeps full assessment history without redoing unchanged work.

**Independent Test** (spec.md): connect a GitHub account, trigger a
population run (`POST /api/runs`), and confirm every eligible repo ends up
with a status tier, completion estimate, and a verdict citing specific
evidence; re-running with nothing changed produces zero new assessment
records (SC-003).

### Tests for User Story 1

- [ ] T013 [P] [US1] Contract test for `POST /api/runs` (202 on trigger, 409 on concurrent trigger) and `GET /api/runs/:runId` (200 with progress fields, 404 unknown id) per contracts/runs-api.md — file: `tests/contract/runs-api.test.ts`
- [ ] T014 [P] [US1] Unit test for FR-006 change-detection: identical README + activity → `inputs_fingerprint` match → no new assessment; any new commit/issue/PR → fingerprint mismatch → new assessment triggered (no accumulation threshold, per spec.md's Clarifications) — file: `tests/unit/change-detection.test.ts`

### Implementation for User Story 1

- [ ] T015 [US1] Implement repo classification: fork / archived / no-README / "no activity at all" (zero commits, issues, or PRs ever — spec.md's Assumptions) each map to a specific `exclusion_reason`; everything else is `included` (FR-002) — file: `lib/repos/classify.ts`
- [ ] T016 [US1] Implement account-wide discovery: enumerate every repo via `lib/github/client.ts` (FR-001), upsert `tracked_repos` (via `classify.ts`) and `activity_records`, working identically for public and private repos (FR-009) — file: `lib/repos/discovery.ts` (depends on T011, T015)
- [ ] T017 [US1] Implement FR-006 change-detection using T014's fixture: compute `inputs_fingerprint` from README + activity_records, compare to the repo's most recent assessment — file: `lib/assessment/change-detection.ts` (depends on T009, T014)
- [ ] T018 [US1] Implement the evidence-grounded assessment call via the Vercel AI SDK's provider abstraction (Constitution Principle VII, NON-NEGOTIABLE — no vendor-specific code path): produce `completion_estimate`, `status_tier`, `verdict`, `evidence_refs`; reject (do not insert) an assessment with empty `evidence_refs` (FR-005) — file: `lib/assessment/provider.ts`
- [ ] T019 [US1] Implement the resumable run state machine (research.md): on trigger, create one `runs` row and one `run_items` row per discovered repo; on each invocation, process not-yet-processed `run_items` within the time budget — calling T017 to skip unchanged repos (`outcome = 'skipped_unchanged'`) and T018 to generate new assessments — updating each item's outcome as it finishes, until none remain, then mark the run `completed` (or `partial` on a stopped/rate-limited run — Edge Cases) — file: `lib/runs/runner.ts` (depends on T016, T017, T018)
- [ ] T020 [US1] Implement `POST /api/runs`: invoke `runner.ts` to create a run and return `202` immediately (FR-010); return `409` with the existing run's id when the database's partial unique index rejects a concurrent insert (FR-011) — file: `app/api/runs/route.ts` (depends on T019)
- [ ] T021 [US1] Implement `GET /api/runs/:runId`: return the run's current status/progress fields per contracts/runs-api.md — file: `app/api/runs/[runId]/route.ts` (depends on T019)
- [ ] T022 [US1] Wire a Vercel Cron trigger to advance any `in_progress` run (research.md's chunked-cron design) — files: `vercel.json` (cron schedule), a cron-invoked route reusing T019's advance logic (depends on T019, T020)
- [ ] T023 [US1] Build the dashboard listing page rendering each eligible repo's status tier, completion estimate, and verdict text (no sorting/freshness — that's spec 002) — files: `app/(dashboard)/page.tsx`, `components/repo-list/` (depends on T009, T018)

**Checkpoint**: User Story 1 is fully functional and independently
testable per its Independent Test above.

---

## Phase 4: User Story 2 - Understand why a repo isn't assessed (Priority: P1)

**Goal**: Any repo that isn't assessed says exactly why, visibly, without
needing to inspect it on GitHub directly.

**Independent Test** (spec.md): point the tool at an account containing a
fork, an archived repo, and a no-README repo; confirm each is visibly
marked excluded with its specific reason.

**Depends on User Story 1**: T015's classification already computes
`exclusion_reason` as part of making US1's "eligible" filtering correct;
this story is specifically about *surfacing* that already-computed value,
not computing it for the first time.

### Tests for User Story 2

- [ ] T024 [P] [US2] Integration test: after a population run, a fork, an archived repo, and a no-README repo in the same account each show the correct, specific `exclusion_reason` (FR-002, FR-003) — file: `tests/integration/exclusion-reasons.test.ts`

### Implementation for User Story 2

- [ ] T025 [US2] Surface `exclusion_reason` in the dashboard listing for any repo with `inclusion_state = 'excluded'`, distinct from a generic excluded flag (FR-003) — file: `components/repo-list/` (extends T023)

**Checkpoint**: User Stories 1 and 2 both work independently.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [ ] T026 [P] Verify Neon's Vercel-native integration against our own setup (research.md's flagged "to verify, not assumed" items): (a) that each Preview Deployment actually gets its own `preview/<git-branch>` database branch rather than sharing one, not just a dashboard assumption from T008, and (b) that env-var propagation timing holds up (no build connecting to the main branch before its own branch's `DATABASE_URL` is injected) — manual verification, not code
- [ ] T027 [P] Confirm `pnpm typecheck && pnpm lint && pnpm format:check && pnpm test` matches CI (T007) exactly, per `github.md`'s pre-PR requirement
- [ ] T028 Run through quickstart.md's validation steps end-to-end against the implemented feature

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately (after the worktree/docs-only-phase note above).
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS both user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational. No dependency on User Story 2.
- **User Story 2 (Phase 4)**: Depends on Foundational **and** on User Story 1's T015/T023 (see "Depends on User Story 1" above) — the one place this feature's two stories aren't fully independent, and that's called out deliberately rather than left implicit.
- **Polish (Phase 5)**: Depends on both user stories being complete.

### Within Each User Story

- Tests before implementation (T013/T014 before T015–T023; T024 before T025).
- Classification/discovery before change-detection/assessment before the run state machine before the API routes before the UI.
- Story complete before moving to the next priority.

### Parallel Opportunities

- T002, T003, T004, T005 (Setup) can run in parallel.
- T011, T012 (Foundational) can run in parallel.
- T013, T014 (US1 tests) can run in parallel.
- T024 (US2 test) can run independently of US1's remaining polish once T015/T023 land.

---

## Parallel Example: User Story 1

```bash
# Launch both User Story 1 tests together:
Task: "Contract test for POST /api/runs and GET /api/runs/:runId in tests/contract/runs-api.test.ts"
Task: "Unit test for change-detection fingerprinting in tests/unit/change-detection.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (including CI and Vercel/Neon linking — T007, T008).
2. Complete Phase 2: Foundational.
3. Complete Phase 3: User Story 1.
4. **STOP and VALIDATE**: run spec.md's Independent Test for US1 and confirm SC-001/SC-003.
5. Open the PR (CI, now live, gates it) — this is also the commit that performs the `CLAUDE.md` docs-only-phase self-deletion (see the note before Phase 1).

### Incremental Delivery

1. Setup + Foundational → foundation ready.
2. User Story 1 → test independently → this is the MVP.
3. User Story 2 → test independently → exclusion reasons now visible.
4. `specs/002-sortable-repo-listing` is a separate, later feature — not part of this task list.

---

## Notes

- [P] tasks touch different files with no dependency on an incomplete task.
- Commit after each task or logical group, per `git.md`'s "one logical change per commit."
- Every task in Phase 1 onward is real application code — the docs-only-phase carve-out no longer applies once T001 lands.
