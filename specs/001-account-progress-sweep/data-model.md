# Phase 1 Data Model: Account-Wide Progress Sweep

Entities correspond to PRD.md §9's conceptual data model, made concrete for
this feature. All tables live in the single Postgres database described in
research.md ("Database / query layer").

## `tracked_repos`

One row per repository discovered in the account.

| Field | Type | Notes |
|---|---|---|
| `id` | text, PK | GitHub's own repo id — stable identity, not owner/name (which can change on rename). |
| `owner` | text | For display and GitHub API calls. |
| `name` | text | For display and GitHub API calls. |
| `is_fork` | boolean | From GitHub repo metadata. |
| `is_archived` | boolean | From GitHub repo metadata. |
| `has_readme` | boolean | Derived at discovery/refresh time. |
| `inclusion_state` | enum(`included`, `excluded`) | FR-002. |
| `exclusion_reason` | text, nullable | Required (non-null) when `inclusion_state = 'excluded'`; one of: `fork`, `archived`, `no_readme`, `no_activity` (FR-002, FR-003). |
| `last_activity_at` | timestamptz, nullable | Most recent commit/issue/PR timestamp seen; null only if genuinely no activity ever. |
| `created_at` / `updated_at` | timestamptz | Standard bookkeeping. |

**Lifecycle**: created on first discovery; `inclusion_state` and
`exclusion_reason` are recomputed on every population run per FR-002 (this
feature has no manual-override path — that's PRD User Story 3, a later
feature, per spec.md's Assumptions).

## `activity_records`

One row per commit, issue, or pull request belonging to a tracked repo —
the evidence an assessment cites.

| Field | Type | Notes |
|---|---|---|
| `id` | uuid, PK | |
| `repo_id` | FK → `tracked_repos.id` | |
| `kind` | enum(`commit`, `issue`, `pull_request`) | |
| `external_id` | text | GitHub's id/SHA for this item — used for de-duplication on repeated fetches. |
| `occurred_at` | timestamptz | Commit/issue/PR timestamp. |
| `summary` | text | Minimal fields needed as citable evidence (title, or commit message headline) — not a full mirror of GitHub's data. |
| `fetched_at` | timestamptz | When this record was pulled. |

**Uniqueness**: `(repo_id, kind, external_id)` unique — re-fetching the same
activity is an upsert, not a duplicate row.

## `assessments`

One immutable record per assessment ever generated for a repo (FR-007).

| Field | Type | Notes |
|---|---|---|
| `id` | uuid, PK | |
| `repo_id` | FK → `tracked_repos.id` | |
| `created_at` | timestamptz | Never updated after insert — this *is* the ordering key for "current assessment" (FR-007). |
| `completion_estimate` | numeric | A proportional measure (e.g., 0–100); exact representation is a UI/prompt-design detail, not fixed here. |
| `status_tier` | enum(`on_track`, `at_risk`, `stalled`) | FR-004. |
| `verdict` | text | Written justification. |
| `evidence_refs` | `activity_records.id[]` | What the verdict actually cites (FR-005 — an assessment with none is rejected before insert, not stored invalid). |
| `inputs_fingerprint` | text | Hash of (README content + relevant `activity_records` as of generation) — compared on the next run to decide whether inputs have changed (FR-006). |

**Lifecycle**: insert-only. "The current assessment" for a repo is derived
as `MAX(created_at)` per `repo_id`, never a mutable field.

## `runs`

One record per population run (FR-008).

| Field | Type | Notes |
|---|---|---|
| `id` | uuid, PK | |
| `status` | enum(`in_progress`, `completed`, `failed`, `partial`) | `partial` covers the rate-limit edge case (some repos reached, run stopped cleanly). |
| `started_at` / `finished_at` | timestamptz | `finished_at` null while `in_progress`. |
| `repos_total` / `repos_processed` / `repos_failed` | integer | Run-record summary (FR-008) without reading raw logs. |

**Constraint**: partial unique index on `status` where `status =
'in_progress'` — enforces FR-011 (reject a trigger while one's already
running) at the database level (research.md).

## `run_items`

One row per repo being processed within a given run — what makes the run
resumable/chunked (research.md) and each repo's progress independently
visible (FR-010).

| Field | Type | Notes |
|---|---|---|
| `id` | uuid, PK | |
| `run_id` | FK → `runs.id` | |
| `repo_id` | FK → `tracked_repos.id` | |
| `outcome` | enum(`pending`, `succeeded`, `failed`, `skipped_unchanged`) | `skipped_unchanged` is FR-006's fingerprint match. |
| `processed_at` | timestamptz, nullable | Null while `pending`. |
| `error_message` | text, nullable | Populated only when `outcome = 'failed'` (e.g., invalid LLM credential — Edge Cases). |

**Uniqueness**: `(run_id, repo_id)` unique — each repo appears at most once
per run.
