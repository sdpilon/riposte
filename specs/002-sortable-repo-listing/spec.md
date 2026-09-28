# Feature Specification: Sortable, Freshness-Aware Repo Listing

**Feature Branch**: `002-sortable-repo-listing`

**Created**: 2026-09-27

**Status**: Draft

**Input**: User description: "Split out from specs/001-account-progress-sweep (User Story 3): as the account owner, I want the populated repos presented as a single listing I can sort by recency, so I can scan for what needs attention without opening individual repos. Depends on specs/001-account-progress-sweep already being built — this feature only changes how already-assessed repos are presented, not how they get assessed."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See the whole account at a glance (Priority: P2)

As the account owner, I want the populated repos presented as a single
listing I can sort by recency, so I can scan for what needs attention
without opening individual repos.

**Why this priority**: valuable on top of the core assessment loop
(`specs/001-account-progress-sweep`), but that feature already delivers its
core value (real per-repo verdicts, visible exclusions) without this —
sorting and freshness cues make the listing faster to scan, they don't
change what's true about any one repo.

**Independent Test**: with a population run already complete (per
`specs/001-account-progress-sweep`), view the listing and confirm every
eligible repo appears with its status tier and completion estimate, and
that sorting by last-assessed time and by last-real-activity time both
produce a correctly ordered listing.

**Acceptance Scenarios**:

1. **Given** a completed population run across repos with different
   last-activity times, **When** viewing the listing sorted by last-real-
   activity, **Then** repos appear ordered from most to least recently
   active.
2. **Given** a completed population run across repos with different
   last-assessed times, **When** viewing the listing sorted by last-assessed
   time, **Then** repos appear ordered from most to least recently assessed.
3. **Given** a repo whose real activity has changed since its current
   assessment was generated, **When** viewing that repo in the listing,
   **Then** it's visibly marked as having a stale assessment relative to its
   activity, distinct from a repo whose assessment is fresh.

---

### Edge Cases

- A repo has never been assessed at all (excluded, or assessment still
  pending/failed per `specs/001-account-progress-sweep`'s run handling):
  sorting by last-assessed time places it consistently (e.g., at the end),
  rather than erroring or being silently dropped from the sort order.
- A repo's last-real-activity and last-assessed time are identical (assessed
  immediately after its most recent activity): it's shown as fresh, not
  stale — staleness is about activity happening *after* the current
  assessment was generated, not simultaneity.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST support sorting the repo listing by last-assessed
  time.
- **FR-002**: System MUST support sorting the repo listing by last-real-
  activity time.
- **FR-003**: System MUST show, per repo, its last real activity time.
- **FR-004**: System MUST show, per repo, whether its current assessment is
  fresh or stale relative to its last real activity time.
- **FR-005**: System MUST place repos with no assessment yet (excluded, or
  pending/failed) at a consistent, well-defined position in either sort
  order, rather than an arbitrary or unstable one.

### Key Entities

- **Tracked repo** (as defined in `specs/001-account-progress-sweep`): this
  feature adds no new fields to it beyond reading its existing last-activity
  and current-assessment timestamps to derive sort order and freshness.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Sorting the listing by either supported order (last-assessed,
  last-real-activity) always produces a stable, correctly ordered result,
  including repos with no assessment yet.
- **SC-002**: A person viewing the listing can distinguish a stale
  assessment from a fresh one for any given repo without cross-referencing
  raw timestamps by hand.

## Assumptions

- Depends on `specs/001-account-progress-sweep` already being implemented —
  this feature only changes how already-assessed repos are presented, not
  how or when they get assessed.
- The account-level rollup view (status-tier breakdown, trend over time)
  remains a separate, later feature per PRD User Story 2 and is out of scope
  here.
