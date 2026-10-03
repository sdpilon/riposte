# Compliance Audit Policy

## Why a separate check is needed

The constitution's Core Principles get a Compliance Review before every feature's
implementation. The Development Practices section has no equivalent — a written
commitment with no recurring verification degrades to whatever anyone last checked it
against.

Rationale: `engineering-practices.md`'s "Documentation and tracker discipline"
section — ground a claim in current actual state, never in what a prior check said.

## What gets checked

Only claims mechanically verifiable from repo content, requiring no credentials
beyond what CI already has:

## What gets checked: CA-1

**CA-1**: The repository MUST contain release/versioning automation tooling.

Rationale: `engineering-practices.md`'s "Documentation and tracker discipline" section — ground a claim in current actual state, never in what a prior check said.

## What gets checked: CA-2

**CA-2**: The repository MUST contain self-host packaging (a container/compose definition or equivalent).

Rationale: `engineering-practices.md`'s "Documentation and tracker discipline" section — ground a claim in current actual state, never in what a prior check said.

## What gets checked: CA-3

**CA-3**: The code path that fetches and forwards untrusted external content (e.g. a repository README) MUST have sanitization or prompt-injection handling near it.

Rationale: `engineering-practices.md`'s "Documentation and tracker discipline" section — ground a claim in current actual state, never in what a prior check said.

## What gets checked: CA-4

**CA-4**: The repository MUST provide a credential-free demo or fake-data path.

Rationale: `engineering-practices.md`'s "Documentation and tracker discipline" section — ground a claim in current actual state, never in what a prior check said.

## What gets checked: CA-5

**CA-5**: Application source (`lib/`, `app/`, `components/`) MUST NOT contain hardcoded personal-identity strings.

Rationale: `engineering-practices.md`'s "Documentation and tracker discipline" section — ground a claim in current actual state, never in what a prior check said.

## What gets checked: CA-6

**CA-6**: Personal/local files (e.g. `CLAUDE.local.md`, `.claude/settings.local.json`) MUST exist where expected and MUST remain untracked by git.

Rationale: `engineering-practices.md`'s "Documentation and tracker discipline" section — ground a claim in current actual state, never in what a prior check said.

## What gets checked: CA-7

**CA-7**: This check MUST NOT attempt to verify any obligation that requires credentials beyond what CI already holds — see [`branch-protection.md`](branch-protection.md) for the obligation this excludes.

Rationale: `engineering-practices.md`'s "Documentation and tracker discipline" section — ground a claim in current actual state, never in what a prior check said.

## What gets checked: CA-8

**CA-8**: The repository MUST contain self-host documentation.

Rationale: `engineering-practices.md`'s "Documentation and tracker discipline" section — ground a claim in current actual state, never in what a prior check said.

## How it runs

A non-blocking step in the CI workflow, triggered on push to `main` only. Not
scheduled on a timer: none of CA-1 through CA-6 or CA-8 can become newly false
without something first being committed to the trunk, so a time-based recheck would
only ever re-confirm an answer that hasn't changed. It never fails the build — these
are hygiene findings, not per-PR correctness, and shouldn't block a merge the way
type-checking or tests do.

## What happens to a finding

Every gap becomes a GitHub issue filed in the same run it's found, labeled
`process-hygiene` and titled with the obligation's ID, checked against already-open
issues under that label for the same ID first so reruns don't duplicate it. Never
left to be remembered later, and never recorded only in an agent's own session
memory. That label is the live record of what's currently unmet — this policy and the
constitution reference it as the source of truth, rather than asserting a status here
that would start drifting immediately.

## What this does not do

This checks existence and pattern, never sufficiency. It can report that CA-8 is
unmet because no self-host documentation exists; it cannot judge whether
documentation that does exist is actually good enough. Turning a finding into a real
fix is ordinary development work, done through this repo's normal process — this
policy's only job is to keep surfacing the gap until that work closes it.
