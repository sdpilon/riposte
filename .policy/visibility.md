# Visibility Policy

Where something lives depends on one test, then — for anything that fails it — how
durable it is.

## The test

**VIS-1**: A file MUST be committed to the repo only if it would be useful or safe to a stranger picking up the repo cold — a future self-hoster, a collaborator, or an agent working in it for the first time.

Rationale: this repo is public by default (Constitution Principle I: self-hosted, single-user, no hosted trust model to protect) — there's no "private repo" tier to design for. The only real distinction is between what any reader benefits from and what's noise or risk to them.

## What fails the test, and where it goes instead

Anything that fails the test splits by **durability**, not by sensitivity — actual secrets and credentials are excluded separately, below, and never make it to a file at all.

## What fails the test: VIS-2

**VIS-2**: Content that is durable but personal/environment-specific (a local path, a personal tool preference, a machine-specific workaround) MUST go in `CLAUDE.local.md` (gitignored), never a tracked file.

## What fails the test: VIS-3

**VIS-3**: Content that is ephemeral or not yet settled (an in-progress idea, a convention still being decided, current task state) MUST live only in session/project memory, never a repo file, until it graduates into a committed file (see VIS-5).

## Secrets and credentials

**VIS-4**: Secrets and credentials MUST NOT touch any file, public or private, at all.

Rationale: Constitution Principle VIII already covers this — credentials belong to the operator, supplied at runtime, never held by the repo or by any account acting on its behalf.

## Graduating from memory to a committed file: VIS-5

**VIS-5**: When a memory entry graduates into `.policy/`, `CONTRIBUTING.md`, or `CLAUDE.md`, its memory entry MUST be deleted or collapsed to a one-line pointer in the same change, so the two never quietly drift apart.

## Graduating from memory to a committed file: VIS-6

**VIS-6**: Genuinely ephemeral project state and agent-behavior-only feedback (how a specific person prefers to collaborate) MUST NOT graduate out of memory, no matter how settled — neither is relevant to a human reading this repo, so neither belongs in it regardless of durability.
