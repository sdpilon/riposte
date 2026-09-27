# Visibility Policy

Where something lives depends on one test, then — for anything that fails it — how
durable it is.

## The test

**Would this be useful or safe to a stranger picking up this repo cold** — a future
self-hoster, a collaborator, or an agent working in this repo for the first time? If
yes, it belongs in the repo, committed, public. If no, it doesn't go in the tracked
repo at all.

Rationale: this repo is public by default (Constitution Principle I: self-hosted,
single-user, no hosted trust model to protect) — there's no "private repo" tier to
design for. The only real distinction is between what any reader benefits from and
what's noise or risk to them.

## What fails the test, and where it goes instead

Anything that fails the test splits by **durability**, not by sensitivity — actual
secrets and credentials are excluded separately, below, and never make it to a file at
all.

- **Durable but personal/environment-specific** (a local path, a personal tool
  preference, a machine-specific workaround) → `CLAUDE.local.md`, gitignored. It's
  real and worth keeping, just not useful to anyone else reading this repo.
- **Ephemeral or not yet settled** (an in-progress idea, a convention still being
  decided, current task state) → Claude's own per-project session memory, not a repo
  file at all. Once it's actually decided, it graduates into a committed file (see
  below) and the memory entry is retired.

## Secrets and credentials

Never a visibility question — they never touch a file, public or private, in the
first place. Constitution Principle VIII already covers this: credentials belong to
the operator, supplied at runtime, never held by the repo or by any account acting on
its behalf.

## Graduating from memory to a committed file

A realization starts as memory when it isn't fully decided yet. It graduates into
`docs/policies/`, `CONTRIBUTING.md`, or `CLAUDE.md` once it's an actual decided
policy — not a floated idea. Once it's committed, the memory entry is deleted or
collapsed to a one-line pointer; the repo file becomes the one source of truth, so the
two never quietly drift apart.

What never graduates out of memory, no matter how settled: genuinely ephemeral project
state (what's being worked on right now) and agent-behavior-only feedback (how a
specific person prefers to collaborate) — neither is relevant to a human reading this
repo, so neither belongs in it regardless of durability.
