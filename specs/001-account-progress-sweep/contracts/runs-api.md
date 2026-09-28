# Contract: Population Run API

Route Handlers under `app/api/runs/`. Both endpoints operate on the `runs` /
`run_items` tables from data-model.md.

## `POST /api/runs`

Trigger a population run (FR-010, FR-011).

**Request body**: none required.

**Responses**:

| Status | Body | When |
|---|---|---|
| `202 Accepted` | `{ "runId": "<uuid>", "status": "in_progress", "reposTotal": <int> }` | No run was already in progress; a new `runs` row (and its `run_items`) was created. Returns immediately — does not wait for any repo to finish processing. |
| `409 Conflict` | `{ "error": "run_in_progress", "runId": "<uuid of the existing run>" }` | A run is already `in_progress` (FR-011). The database's partial unique index is the actual enforcement; this response surfaces that constraint's rejection. |

## `GET /api/runs/:runId`

Poll a run's progress (FR-010's "incremental visibility").

**Response** `200 OK`:

```json
{
  "runId": "<uuid>",
  "status": "in_progress | completed | failed | partial",
  "startedAt": "<ISO 8601>",
  "finishedAt": "<ISO 8601 | null>",
  "reposTotal": 42,
  "reposProcessed": 17,
  "reposFailed": 1
}
```

`404 Not Found` if `runId` doesn't exist.

## Out of scope for this contract

- Listing individual `run_items` (per-repo outcome within a run) — the
  dashboard listing (`app/(dashboard)/page.tsx`) reads current state from
  `tracked_repos`/`assessments` directly, not from `run_items`; the run
  endpoints exist to drive and observe the run itself, not to be the
  UI's data source for repo state.
- Cancelling an in-progress run — not required by any FR in spec.md.
