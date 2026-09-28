# Feature Specification: Account-Wide Progress Sweep

**Feature Branch**: `001-account-progress-sweep`

**Created**: 2026-09-27

**Status**: Draft

**Input**: User description: "Account-wide progress sweep: as the account owner, I want to see every one of my repos with a completion estimate and status tier, so I can tell at a glance which projects are on track, at risk, or stalled without opening each one. This is User Story 1 (P1) from PRD.md — connect a GitHub account, trigger a population run, and see a populated dashboard listing with a status tier and completion estimate per repo. A repo with no README is auto-excluded with the specific reason visible."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Populate the account with real assessments (Priority: P1)

As the account owner, I want a population run to discover every repo in my
account and generate an evidence-grounded completion estimate and status tier
for each eligible one, so the dashboard reflects real, current standing
instead of staying empty or showing stale placeholders.

**Why this priority**: this is the core value proposition — nothing else in
this feature (or the product) matters if repos never actually get assessed.

**Independent Test**: connect a GitHub account, trigger a population run, and
confirm that every eligible repo ends up with a status tier, a completion
estimate, and a written verdict that cites specific evidence (commits,
issues, or pull requests) rather than a generic statement.

**Acceptance Scenarios**:

1. **Given** a connected GitHub account with repos of varying activity,
   **When** a population run completes, **Then** every eligible repo has a
   status tier (on track / at risk / stalled), a completion estimate, and a
   written verdict that names specific evidence for that verdict.
2. **Given** a repo that was already assessed in a prior run, **When** a
   second population run completes and that repo's README, recent commits,
   and issue/PR state are unchanged, **Then** no new assessment is generated
   for it and its existing assessment remains "current."
3. **Given** a repo whose README, commits, or issues/PRs have changed since
   its last assessment, **When** a population run completes, **Then** a new
   assessment record is created for it and becomes the current one, while its
   prior assessment(s) remain in history, unmodified.

---

### User Story 2 - Understand why a repo isn't assessed (Priority: P1)

As the account owner, I want any repo that isn't being assessed to say
exactly why, so I never have to wonder whether the tool missed it or
deliberately skipped it.

**Why this priority**: silent exclusion is indistinguishable from a bug from
the user's side. Trust in every other number this feature shows depends on
first trusting that "not shown as assessed" always has a visible reason.

**Independent Test**: point the tool at an account containing at least one
fork, one archived repo, one repo with no README, and one confirm each one
is visibly marked excluded with its specific reason, without needing to
inspect the repo directly on GitHub to understand why.

**Acceptance Scenarios**:

1. **Given** a repo that is a fork, is archived, has no README, or has no
   commit/issue/PR activity at all, **When** a population run completes,
   **Then** that repo is excluded from assessment and the dashboard shows the
   specific reason (not a generic "excluded" flag).
2. **Given** a repo that fails none of the automatic exclusion conditions,
   **When** a population run completes, **Then** it is included by default
   and shows an assessment like any other included repo.

---

### Edge Cases

- A repo's README exists but is empty or near-content-free: treated as
  present (not auto-excluded for "no README"), but the resulting verdict may
  note the account owner never stated real goals, since Principle II
  (evidence-grounded assessments) still requires evidence, not invention.
- GitHub API rate limits are hit mid-population-run: repos already processed
  keep their new assessments; the run stops cleanly rather than failing
  destructively, and the run record reflects a partial outcome — which repos
  were reached and which weren't — rather than silently looking identical to
  a full success.
- The configured LLM credential is invalid, or the LLM provider errors for a
  specific repo mid-run: that repo's assessment attempt fails and is recorded
  as a failure in the run record; it keeps whatever assessment it already had
  (or stays unassessed if it's the first run) rather than blocking every
  other repo in the same run.
- A repo has genuinely zero commits, issues, or pull requests ever (an empty
  or scaffold-only repo): this is what "no activity at all" (auto-exclusion)
  means — a repo with real historical activity that has since gone quiet is
  a "stalled" verdict, not an exclusion, since surfacing exactly that
  distinction is the product's reason to exist.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST automatically discover every repository owned by
  the connected account when a population run executes — no per-repo setup
  or hand-listing required before a repo can be discovered.
- **FR-002**: System MUST auto-exclude a repo from assessment when it is a
  fork, is archived, has no README, or has no commit/issue/PR activity at
  all; every other discovered repo is included by default.
- **FR-003**: System MUST make the specific exclusion reason for any
  auto-excluded repo visible in the listing, not just an excluded/included
  flag.
- **FR-004**: System MUST generate, for each included repo, a completion
  estimate, a status tier (on track / at risk / stalled), and a written
  verdict that cites specific evidence (commits, issues, or pull requests)
  checked against what that repo's own README states as its goals.
- **FR-005**: System MUST reject an assessment that carries no supporting
  evidence — an assessment is not considered valid without it.
- **FR-006**: System MUST regenerate a repo's assessment only when its
  meaningful inputs (README content, recent commit history, issue/PR titles
  and states) have actually changed since that repo's last assessment.
- **FR-007**: System MUST retain every assessment ever generated for a repo
  as its own record, never overwriting a prior one; "the current assessment"
  for a repo is always its most recent record.
- **FR-008**: System MUST record, per population run, when it started and
  finished, its outcome, and enough of a summary (repos reached, repos
  updated, anything that failed) that a run which silently under-performed
  can be spotted without reading raw logs.
- **FR-009**: System MUST work identically against public and private repos
  in the connected account, private repos via credentials supplied by the
  account owner.

### Key Entities

- **Tracked repo**: one entry per repository discovered in the account.
  Carries whether it's currently included in assessment and, separately, the
  specific reason when it isn't.
- **Activity record**: a commit, issue, or pull request belonging to a
  tracked repo, used as the evidence an assessment cites.
- **Assessment**: one immutable record per assessment ever generated for a
  repo — completion estimate, status tier, evidenced verdict, and enough of
  what was fed into it to explain later why it said what it said. "The
  current assessment" is the latest record, derived, never a field that gets
  edited in place.
- **Run record**: one record per population run — when it started and
  finished, its outcome, and a summary of what it reached, updated, or
  failed on.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After a population run completes on an account with up to
  ~100 repos, 100% of eligible repos display a status tier, a completion
  estimate, and an evidenced verdict — none are left showing a placeholder
  or generic state.
- **SC-002**: 100% of repos not shown as assessed display a specific,
  human-readable exclusion reason, with zero repos silently missing from
  the listing without one.
- **SC-003**: Re-running a population run against an account with no
  underlying repo changes produces zero new assessment records — confirming
  unchanged repos are recognized as unchanged, not silently re-assessed.
- **SC-004**: A person unfamiliar with a specific repo can tell, from the
  listing alone and within seconds, whether it's on track, at risk, or
  stalled, and see the specific evidence behind that call without opening
  the repo itself.

## Assumptions

- A minimal way to trigger a population run on demand (e.g., an admin
  action or a single control) exists for this feature to be testable
  end-to-end; the full "operate a running instance" experience — entering
  credentials from within the app, scheduled/recurring runs, an access gate
  — is its own, separate feature and out of scope here.
- Status tier and completion estimate are assigned by the LLM's own
  evidence-grounded reasoning (Constitution Principle II), not a fixed
  numeric formula or hardcoded thresholds — this feature does not define
  scoring rules beyond "must cite real evidence."
- "No activity at all" (an auto-exclusion condition) means zero commits,
  issues, or pull requests in the repo's entire history — not a recent-
  activity time window. A repo with real historical activity that has since
  gone quiet is intentionally NOT excluded; it should surface as "stalled."
- The account-level rollup view (status-tier breakdown, trend over time)
  from PRD User Story 2, manual inclusion/freeze overrides from PRD User
  Story 3, README rendering (PRD FR-014), and sortable/freshness-aware
  listing presentation (PRD FR-010, FR-011 — split out to
  `specs/002-sortable-repo-listing`) are separate, later features and are
  explicitly out of scope for this spec.
- Organization repos are out of scope, per PRD's Assumptions & Dependencies
  (personal account only for v1).
