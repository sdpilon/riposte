# Spec

The product's current intended shape: what it does, for whom, and the
concepts it's built from. This describes _what_ and _why_ — never a
specific language, framework, database, or hosting target. Those are
implementation decisions, made later, once a stack is chosen. See
`.specify/memory/constitution.md` for the durable principles this spec is built on.

## Overview

A dashboard that discovers every repository in a GitHub account
automatically and, for each one, generates an AI-written progress
assessment: a completion estimate, a status tier (on track / at risk /
stalled), and a written verdict citing real evidence — commits, issues,
and pull requests — checked against what the repo's own README says it's
trying to do. The assessment is re-generated only when something
meaningful has actually changed, so staying current is cheap. Everything
renders live from the tool's own database on every view; there's no
separate "publish" or "rebuild" step to remember to run.

## Who it's for

One person, running one instance against their own GitHub account and
their own database. There's no login/accounts system beyond an optional
shared-secret gate for an instance exposed outside a private network, and
no notion of multiple GitHub accounts or multiple users sharing one
instance — that's not a goal here, just not something this needs to
support.

A separate, credential-free demo mode exists: a shared instance seeded
with fake data, safe for anyone to look at without connecting a real
account, with any state-changing controls disabled so visitors can't
affect what others see.

## Functional requirements

### Discovery and assessment

- **Automatic repo discovery.** Every repository in the connected
  account is found automatically — nothing is hand-listed or configured
  per repo.
- **Per-repo AI progress assessment.** Each tracked repo gets a
  completion estimate, a status tier, and a written verdict that cites
  specific evidence (commits, issues, pull requests) against what the
  repo's own README states as its goals. An assessment with no supporting
  evidence is not a valid assessment.
- **Change-gated re-assessment.** A repo's assessment is only
  regenerated when its meaningful inputs (its README, its recent commit
  history, its issue/PR titles and states) have actually changed since
  the last assessment. Nothing new to say means no new work done and no
  new assessment generated.
- **Full assessment history is kept, never overwritten.** Each new
  assessment is a new record; "the current assessment" is simply the most
  recent one. Past assessments remain available — this is what makes a
  score-over-time view (below) possible at all.

### Inclusion and overrides

- **Sensible automatic inclusion defaults.** A repo is auto-excluded from
  assessment when it's a fork, archived, has no README, or has no
  activity at all — anything else is included by default. The specific
  reason a repo was auto-excluded is visible, not just a yes/no.
- **Manual inclusion override, per repo.** Independent of the automatic
  default, a person can force a specific repo in or out of assessment
  entirely. Once set manually, that repo's inclusion state stops being
  recomputed automatically until it's explicitly returned to automatic.
- **Manual assessment override, per repo — independent of inclusion.**
  Separately from whether a repo is _included_ at all, a person can freeze
  a specific repo's assessment so it stops being automatically
  regenerated, without also having to exclude it from the dashboard
  entirely. Inclusion and assessment-freshness are two independent
  switches, not one conflated control.

### Viewing and understanding the account

- **An application-style dashboard, not a document.** The primary view is
  a full-width, app-like layout — not a page of stacked cards with
  page-scroll margins. Repos are listed in a table-like structure with
  persistent column headers, so information that would otherwise repeat
  per item (a status label, an "assess" control) is stated once, as a
  column, not once per repo.
- **Sortable by recency.** The repo listing can be sorted by when it was
  last assessed and by when it last had real activity.
- **Staleness is visible.** For each repo, both its last real activity
  time and whether its current assessment is fresh or stale relative to
  that activity are shown — someone should be able to tell "this
  assessment might be out of date" at a glance, without checking dates by
  hand.
- **An account-level rollup view.** Beyond the per-repo listing, there's
  a combined view summarizing the whole account at once: the breakdown of
  repos by status tier, the distribution of completion estimates across
  all assessed repos, and how assessment scores have trended over time.
  This is what makes "how is my account doing overall, not just this one
  repo" answerable without visually scanning every row.
- **Rendered READMEs.** A repo's README renders as GitHub would render
  it — not raw markdown — with any relative links or images resolved back
  to the real repo so they work outside GitHub's own viewer. Rendering
  untrusted markdown content is treated as a real injection surface:
  rendering is hardened against style, form, and remote-image-based
  vectors, not just script tags.
- **Correct link resolution regardless of README location.** When a
  repo's README isn't at the repository root, relative links and images
  in it still resolve against the actual repository root — not against
  the README's own folder, which would silently produce broken links for
  a meaningful fraction of real repos.

### Running and operating an instance

- **Credentials are managed in-app.** Whatever credentials the tool needs
  (a GitHub token, an LLM API key, a database connection) can be entered
  and updated from inside the running application, not only via
  environment variables set before the process starts. A credential is
  checked against the real service it's for before being accepted, so a
  typo or expired token is caught immediately, not discovered on the next
  scheduled run.
- **An on-demand trigger from within the app.** Populating or refreshing
  the account's data doesn't require a separate command-line step or a
  cron job to be configured before the tool is useful — it can be
  triggered from inside the running application itself. A scheduled/
  recurring path remains available for keeping data fresh automatically,
  but isn't the only way to run it.
- **Optional access gate.** An instance exposed beyond a private network
  can require a shared secret to view it; an instance that's only ever
  reachable privately doesn't need to configure this at all.
- **Theme follows system preference.** The interface respects light/dark
  system preference automatically.

## Conceptual data model

These are the concepts the product is built from — entities and how they
relate — described independent of any specific database or schema
technology.

- **Tracked repo.** One entry per repository discovered in the account.
  Carries whether it's currently included in assessment, and separately
  whether that inclusion state was set automatically or manually (see
  "Inclusion and overrides," above).
- **Activity record.** A commit, issue, or pull request belonging to a
  tracked repo. Fetched incrementally — each new run asks only for
  activity since that repo's last successful fetch of that activity type,
  not the whole history every time — so a repo with years of history
  doesn't get progressively more expensive to keep current.
- **Assessment.** One record per assessment ever generated for a repo,
  never edited after the fact — a full history, not a single mutable
  field. "The current assessment" is derived (the latest one), not stored
  as its own separate thing. Carries the completion estimate, status
  tier, evidenced writeup, and enough of a record of what was actually
  fed into it to explain later why it said what it said.
- **Run record.** One record per data-population run: when it started and
  finished, its outcome, and enough of a summary (repos found, repos
  updated, anything that failed) to spot a run that silently
  under-performed without having to re-read raw logs.
- **Credential store.** Wherever the running instance's own credentials
  (GitHub token, LLM API key, database connection, access-gate secret)
  are kept, resolved consistently regardless of whether they were
  supplied as configuration before startup or entered later through the
  running application.

## Open questions

Deliberately unresolved here — implementation decisions for later, not
gaps in this spec:

- Which LLM provider performs the assessment.
- Language, framework, and database technology.
- Hosting target(s) for the public demo.
- Exact packaging/deployment mechanism for self-hosters.
