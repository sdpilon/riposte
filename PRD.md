# Product Requirements Document: Riposte

**Status**: Draft
**Version**: 0.1.0
**Last Updated**: 2026-09-26

This document is the full product requirements document for Riposte. It is
technology-agnostic by design — no language, framework, database, or hosting
target is named here. Those are implementation decisions made later, per
feature, once each is actually needed. See
`.specify/memory/constitution.md` for the durable, non-negotiable principles
this PRD is built on, and `spec.md` for the earlier, narrower functional-
requirements outline this document supersedes in scope (kept until you decide
what to do with it).

## 1. Problem Statement

If you have more than a handful of side projects on GitHub, it's easy to lose
track of how far along any one of them actually is. Memory of "how much is
left" decays faster than the project itself does, and there's no cheap way to
re-establish it without re-reading the whole repo.

Riposte answers a simple question for every repo in your account: **based on
what's actually in this repository, how complete is it, and what's the
evidence for that?** An LLM reads a repo's stated goals (its README) against
its real, ongoing activity (commits, issues, pull requests) and renders a
verdict grounded in specific evidence — not a vibe, not a guess.

This serves three concrete needs, in order of how much they matter to why
this exists at all:

1. **Deciding what to finish.** Some projects are closer to done than you
   remember — worth a few hours to push over the line and get out of the
   "abandoned project" pile.
2. **Deciding what to abandon.** Some projects are clutter — forks you never
   touched, experiments that ran their course. Riposte surfaces these as
   candidates; it never acts on that judgment itself (see Non-Goals).
3. **Deciding when "good enough" already happened.** This is the primary
   reason Riposte exists. Some projects get worked on well past the point of
   real progress — refinement with diminishing returns, chasing perfection
   the project doesn't need. Watching a repo's assessment score plateau
   across several re-assessments, over time, is the signal that it's time to
   call it done and move on. Riposte shows the trend; deciding what the trend
   means stays a human judgment call, not something the tool asserts on your
   behalf.

## 2. Why a Rewrite, Not an Iteration

Riposte is a deliberate from-scratch rebuild of a prior project (internally,
its predecessor) built on the same premise. Two specific frustrations with
building that predecessor — not the product concept itself, which is
unchanged — are why this is a new project rather than continued iteration,
and both are now durable constitution commitments so they can't quietly
regress a second time:

- **Automated quality gates from day one.** Type-checking, linting,
  formatting, and tests, enforced identically locally and in CI, before
  there's meaningful code for them to have caught up to — not bolted on
  after the fact.
- **A committed-vs-personal boundary decided from day one.** What's tracked
  in the repo is project knowledge; personal process, machine-specific
  tooling, and credential-handling habits stay in gitignored local-only
  files from the start, never discovered as an untangling problem later.

## 3. Who It's For

One person, running one instance against their own GitHub account and their
own database. There's no accounts/login system beyond an optional
shared-secret gate for an instance exposed outside a private network, and no
notion of multiple GitHub accounts or multiple users sharing one instance —
this isn't a goal, just not something the design needs to accommodate.

A separate, credential-free demo mode exists: a shared instance seeded with
fake data, safe for anyone to look at without connecting a real account, with
any state-changing controls disabled so visitors can't affect what others
see.

## 4. Goals

- Automatically discover every repository the account owns and generate a
  grounded, evidence-backed progress assessment for each one.
- Make it cheap to keep assessments current — re-assessment happens only
  when something meaningful actually changed.
- Make staleness and trend visible at a glance, both per-repo and across the
  whole account, so a person can spot "closer to done than I thought,"
  "candidate to abandon," and "plateaued — call it done" without re-reading
  every repo by hand.
- Work identically well against public repos and private repos (the latter
  via the operator's own credentials) — this generalizes a boundary the
  predecessor project never actually needed to cross, without ruling out
  going further later (see Non-Goals).
- Be trivial to self-host and trivial to evaluate without first trusting it
  with real credentials.

## 5. Non-Goals

Explicitly excluded, non-negotiable (Constitution Principle III):

- **Any write action against GitHub.** No archiving, deleting, commenting,
  or issue creation from within the app. Riposte can surface "this looks
  like an archive/delete candidate" as information; acting on that judgment
  happens on GitHub itself, by the person, never through this tool.

Not committed either way — deliberately out of scope for this rewrite, but
not permanently ruled out, and not to be assumed absent without asking:

- Notifications/alerts when a repo's status changes.
- Time tracking or effort logging per project.
- Tracking the dollar cost of LLM calls.
- Code-quality or security scanning of repo contents.
- CI status integration.
- Assessing repos beyond the account owner's own (e.g., organization repos,
  or arbitrary repos given separately supplied credentials) — plausible as a
  later option, not a v1 commitment.

## 6. User Stories

### User Story 1 — Account-wide progress sweep (Priority: P1)

As the account owner, I want to see every one of my repos with a completion
estimate and status tier, so I can tell at a glance which projects are on
track, at risk, or stalled without opening each one.

**Why this priority**: this is the core value proposition; nothing else
matters if this doesn't work.

**Independent Test**: connect a GitHub account, trigger a population run,
and see a populated dashboard listing with a status tier and completion
estimate per repo.

**Acceptance Scenarios**:

1. **Given** a connected GitHub account with repos of varying activity,
   **When** a population run completes, **Then** every non-excluded repo has
   a status tier, completion estimate, and a written verdict citing specific
   evidence.
2. **Given** a repo with no README, **When** the run completes, **Then**
   that repo is auto-excluded and the specific reason is visible, not just a
   yes/no.

### User Story 2 — Spotting the "call it done" signal (Priority: P1)

As the account owner, I want to see how a repo's assessment score has
trended across multiple past assessments, so I can recognize when a project
has plateaued and further work would have diminishing returns.

**Why this priority**: this is the primary reason Riposte exists — without
a trend view, the tool only answers "where do things stand today," not
"should I stop here."

**Independent Test**: after a repo has been re-assessed at least twice, view
its assessment history and see the trend, without needing to guess from raw
dates.

**Acceptance Scenarios**:

1. **Given** a repo with 3+ past assessments, **When** viewing that repo,
   **Then** its score history renders as a trend, and past assessments
   remain available, never overwritten.
2. **Given** the account-level rollup view, **When** viewed, **Then** it
   shows how assessment scores have trended over time across the whole
   account, not just per-repo.

### User Story 3 — Manual overrides (Priority: P2)

As the account owner, I want to manually force a repo's inclusion state or
freeze its assessment, independent of each other, so automatic defaults
don't fight my own judgment about a specific repo.

**Why this priority**: important for trust in the tool's defaults, but the
tool is useful without it on day one.

**Independent Test**: manually exclude a repo that would otherwise be
auto-included, confirm it drops out of assessment and stays out until
explicitly returned to automatic.

**Acceptance Scenarios**:

1. **Given** a repo included by default, **When** manually excluded,
   **Then** it stops being assessed and stops appearing in the active
   listing, until returned to automatic.
2. **Given** a repo's assessment frozen manually, **When** its underlying
   activity changes, **Then** no new assessment is generated for it, even
   though it remains included in the dashboard.

### User Story 4 — Getting a feel for the tool (Priority: P2)

As someone curious about Riposte, I want to see a fully working demo seeded
with fake data, so I can get an idea of what the tool does and what it looks
like, without first connecting my own credentials.

**Why this priority**: removes the adoption barrier of "see it before
trusting it," but isn't needed for the account owner's own daily use.

**Independent Test**: load the demo instance with no credentials configured
and see a populated, realistic-looking dashboard with all state-changing
controls disabled.

**Acceptance Scenarios**:

1. **Given** the demo instance, **When** visited with no login, **Then** the
   dashboard renders fully populated fake data.
2. **Given** the demo instance, **When** a state-changing control is
   attempted, **Then** it is visibly disabled, not silently a no-op.

### User Story 5 — Trusting the assessments are real (Priority: P2)

As someone evaluating Riposte before trusting it with my private GitHub
data, I want to see a fully working demo seeded with one or more real public
repositories, so I can judge whether the tool's assessments are genuinely
evidence-grounded, not just a convincing-looking fake, before connecting my
own credentials.

**Why this priority**: a different trust signal than User Story 4 — proves
the assessment engine produces real, verifiable evidence against actual
repo content, rather than only demonstrating the UI against canned data.

**Independent Test**: load a demo populated with at least one real public
repo's actual README/commit/issue history, and see an assessment that
visibly reflects that repo's real content.

**Acceptance Scenarios**:

1. **Given** a real public repo included in the demo, **When** its
   assessment is viewed, **Then** the written verdict cites evidence
   traceable to that repo's actual README, commits, or issues — not
   templated or fabricated text.
2. **Given** the demo instance, **When** a viewer compares an assessment
   against that same repo's real GitHub page, **Then** they can
   independently verify the assessment's claims are accurate to the real
   repo.

### Edge Cases

- What happens when a repo's README exists but is empty or near-content-free?
- What happens when GitHub API rate limits are hit mid-population-run?
- How does the system handle a repo whose README isn't at the repository
  root?
- What happens when the configured LLM credential is invalid or the LLM
  provider errors mid-assessment?

## 7. Functional Requirements

### Discovery and assessment

- **FR-001**: System MUST automatically discover every repository owned by
  the connected account — nothing hand-listed or configured per repo.
- **FR-002**: System MUST generate a completion estimate, a status tier (on
  track / at risk / stalled), and a written verdict citing specific evidence
  (commits, issues, pull requests) against what the repo's own README states
  as its goals, for each tracked repo. An assessment with no supporting
  evidence is not a valid assessment.
- **FR-003**: System MUST only regenerate a repo's assessment when its
  meaningful inputs (README, recent commit history, issue/PR titles and
  states) have actually changed since the last assessment.
- **FR-004**: System MUST keep full assessment history, never overwritten.
  Each new assessment is a new record; "the current assessment" is the most
  recent one.
- **FR-005**: System MUST work identically against public repos and private
  repos, the latter via credentials supplied by the operator.

### Inclusion and overrides

- **FR-006**: System MUST auto-exclude a repo from assessment when it's a
  fork, archived, has no README, or has no activity at all; everything else
  is included by default. The specific exclusion reason MUST be visible, not
  just a yes/no.
- **FR-007**: Users MUST be able to manually force a specific repo's
  inclusion state, independent of the automatic default, and that override
  MUST persist until explicitly returned to automatic.
- **FR-008**: Users MUST be able to freeze a specific repo's assessment,
  independent of its inclusion state, so it stops being automatically
  regenerated without also excluding it from the dashboard.
- **FR-009**: Users MUST be able to scope processing to a manually chosen
  subset of discovered repos (as few as a single repo), instead of
  committing to assessing every eligible repo from the start. Automatic
  discovery still finds every repo; this only controls how many of them are
  actually assessed. It is an opt-in constraint a user reaches for (e.g., a
  first trial run against one repo) layered on top of the default of
  assessing everything eligible — not a decision required before the tool
  is usable at all (Constitution Principle IV).

### Viewing and understanding the account

- **FR-010**: System MUST present the primary view as a full-width,
  app-like layout with persistent column headers, not a page of stacked
  cards.
- **FR-011**: System MUST support sorting the repo listing by last-assessed
  time and by last-real-activity time.
- **FR-012**: System MUST show, per repo, both its last real activity time
  and whether its current assessment is fresh or stale relative to that
  activity.
- **FR-013**: System MUST provide an account-level rollup view: the
  breakdown of repos by status tier, the distribution of completion
  estimates across all assessed repos, and how assessment scores have
  trended over time.
- **FR-014**: System MUST render a repo's README as GitHub would render it,
  with relative links and images resolved back to the real repo so they work
  outside GitHub's own viewer, regardless of where in the repo the README
  actually lives.

### Running and operating an instance

- **FR-015**: Users MUST be able to enter and update the credentials the
  tool needs (GitHub token, LLM API key, database connection) from inside
  the running application, not only via environment variables set before
  the process starts. A credential MUST be checked against the real service
  it's for before being accepted.
- **FR-016**: Users MUST be able to trigger a data-population/refresh run
  on-demand from inside the running application, in addition to any
  scheduled/recurring path.
- **FR-017**: System MUST support an optional shared-secret access gate for
  instances exposed beyond a private network.
- **FR-018**: System MUST respect system light/dark theme preference
  automatically.

## 8. Non-Functional Requirements

- **NFR-001 (Security)**: Rendering untrusted README content MUST be treated
  as a real injection surface — hardened against style-, form-, and
  remote-image-based vectors, not just script tags.
- **NFR-002 (Scale)**: The system MUST be designed comfortably for accounts
  with up to ~100 repositories without meaningful performance degradation.
  This is a deliberate, YAGNI-justified target — it matches the account
  owner's actual scale and anecdotal peer scale; broader multi-user or
  larger-scale concerns are addressed if and when real demand for them
  appears, not designed for speculatively.
- **NFR-003 (Cost efficiency)**: Re-assessment MUST NOT re-run the expensive
  step (an LLM call) on a repo that hasn't meaningfully changed (restates
  FR-003 as a cost constraint, not just a behavioral one).
- **NFR-004 (Portability)**: No principle, feature, or piece of code may
  assume a specific LLM vendor (Constitution Principle VII).
- **NFR-005 (Self-hosting)**: Self-host packaging MUST be a first-class,
  day-one concern, not retrofitted once a different deployment shape already
  exists.

## 9. Conceptual Data Model

These are the concepts the product is built from — entities and how they
relate — described independent of any specific database or schema
technology.

- **Tracked repo.** One entry per repository discovered in the account.
  Carries whether it's currently included in assessment, and separately
  whether that inclusion state was set automatically or manually.
- **Activity record.** A commit, issue, or pull request belonging to a
  tracked repo. Fetched incrementally — each run asks only for activity
  since that repo's last successful fetch of that activity type, so a repo
  with years of history doesn't get progressively more expensive to keep
  current.
- **Assessment.** One record per assessment ever generated for a repo, never
  edited after the fact — a full history, not a single mutable field. "The
  current assessment" is derived (the latest one). Carries the completion
  estimate, status tier, evidenced writeup, and enough of a record of what
  was actually fed into it to explain later why it said what it said.
- **Run record.** One record per data-population run: when it started and
  finished, its outcome, and enough of a summary (repos found, repos
  updated, anything that failed) to spot a run that silently
  under-performed without re-reading raw logs.
- **Credential store.** Wherever the running instance's own credentials
  (GitHub token, LLM API key, database connection, access-gate secret) are
  kept, resolved consistently regardless of whether they were supplied as
  configuration before startup or entered later through the running
  application.

## 10. Assumptions & Dependencies

- The connected GitHub account is a personal user account; organization
  repos are out of scope for v1 (see Non-Goals).
- The operator supplies their own GitHub token (public + private read
  access as needed) and their own LLM API key — no credential is ever held
  on the tool's behalf by anyone but the operator (Constitution Principle
  VIII).
- Assessment quality depends on repos having a README that states real
  goals; a repo with no README is auto-excluded, not assessed with degraded
  confidence.
- GitHub API availability and rate limits are an external dependency; the
  incremental activity-fetch design (see Conceptual Data Model) is intended
  to keep usage well within normal limits at the ~100-repo target scale.
- Which LLM provider performs assessment is undecided and deliberately
  deferred (see Open Questions) — the product's behavior must not depend on
  which one is eventually chosen.

## 11. Success Criteria

- **SC-001**: Someone looking at the dashboard can tell, within seconds and
  without reading each repo themselves, which projects are converging on
  what they set out to build and which have stalled or drifted — and see
  *why*, in evidence (Constitution Success Criteria).
- **SC-002**: A repo that has plateaued in its assessment score across
  multiple re-assessments is visually distinguishable from one still
  actively progressing, without the user having to compare raw dates or
  numbers by hand.
- **SC-003**: A new self-hoster can go from "nothing running" to "seeing
  real assessments" with minimal required configuration decisions
  (Constitution Principle IV).
- **SC-004**: The demo instance is fully evaluable by a visitor with zero
  credentials and zero state-changing risk to other visitors.

## 12. Risks & Accepted Limitations

- **Assessment error is two-directional and considered equally bad.** An
  LLM assessment can be wrong by overstating completion (false confidence —
  risk of prematurely deprioritizing something that still needs work) or by
  understating it (false pessimism — risk of abandoning something actually
  close to done). Neither direction is treated as more acceptable than the
  other.
- **The tool is directional, not precise, even with evidence-backed
  claims.** This is an accepted limitation, not a defect to be engineered
  away — the assessment is meant to inform a human judgment call (especially
  the "diminishing returns, call it done" decision), never to replace one.
- **LLM cost and GitHub rate limits are real constraints whose shape depends
  on a still-undecided LLM provider** — addressed concretely once that
  choice is made (see Open Questions), not designed against speculatively.

## 13. Open Questions

Deliberately unresolved here — implementation decisions for later, not gaps
in this PRD:

- Which LLM provider performs the assessment.
- Language, framework, and database technology.
- Hosting target(s) for the public demo.
- Exact packaging/deployment mechanism for self-hosters.
- Whether/when to extend assessment beyond the account owner's own repos
  (organizations, or arbitrary repos given separate credentials).
