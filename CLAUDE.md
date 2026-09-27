# CLAUDE.md

Agent-operational form of this repo's process policies. `CONTRIBUTING.md` is the
human-readable narrative of the same rules; `.policy/*.md` are the underlying
policies with their rationale. This file exists specifically so these rules persist
across sessions without depending on this conversation or on Claude's own memory
system staying intact.

## Current phase

**Docs-only — no application code yet.** Commits go straight to `main`, no PR
required. This is a deliberate, time-boxed exception, not the standing convention.

**This exception ends the moment real application code lands in this repo.** At that
point, before anything else, remove every mention of it — don't just switch behavior
and leave the old carve-out written down somewhere for a future session to trip over:

1. Delete this "Current phase" section from this file entirely.
2. In this file, drop the "(once the docs-only exception above has ended)" qualifier
   from the `## GitHub` heading below — it becomes a plain `## GitHub` section with no
   conditional framing.
3. In [`.policy/github.md`](.policy/github.md), rewrite "When a pull
   request is required" to state the PR-required rule unconditionally — remove "Until
   then (the current docs-only phase), commits go straight to `main` — see `CLAUDE.md`
   for the live status of that interim exception and what ends it" and the rationale
   sentence about "carving out a docs-only exception."
4. In [`CONTRIBUTING.md`](CONTRIBUTING.md), remove the parenthetical "(see `CLAUDE.md`
   for whether that's true right now)" from "Opening a pull request" — the PR
   requirement is no longer conditional, so it shouldn't read as if it might not be.

Do this as one commit, in the same change that introduces the first real application
code — not a follow-up. Never rely on "treat this as stale" as a substitute for
actually deleting it; a fresh session has no way to know a note is stale unless the
note itself is gone.

## Which change needs Spec Kit

- Adds/changes product behavior → full flow: `speckit-specify` → `speckit-clarify` →
  `speckit-plan` → `speckit-tasks` → `speckit-implement`. Check against
  `constitution.md` before implementation.
- Trivial, unambiguous fix (typo, one-line fix with an obviously correct resolution) →
  skip straight to a normal commit.
- When genuinely unsure which category applies, treat it as the first.

## Git

- One logical change per commit. Conventional Commits style, single line unless a
  body is genuinely necessary.
- Any branch/PR-bound work: create a worktree first.
- On merge: delete the branch and worktree in the same action, not a separate later
  step. End state after any completed work: `git status` reports a clean `main`, up
  to date with `origin/main`, no stray branches or worktrees.
- Ask before creating a new top-level file or directory convention. Don't ask for a
  file that's obviously part of already-approved work.
- Use only the operator's own ambient credentials for git/GitHub operations — never
  read from or depend on a repo-local secret, script, or personal alias.

## GitHub (once the docs-only exception above has ended)

- Every commit goes through a PR, no exceptions by file type.
- Before opening: run the full local quality gate (type-check, lint, format, test) —
  same commands as CI — and confirm green.
- Draft the PR body from `.github/PULL_REQUEST_TEMPLATE.md`, filled in section by
  section. Write it to a temp file, pass via `--body-file`.
- Never open a PR unasked just because a branch was pushed — separate authorizations.
- Never merge, regardless of CI status or how trivial the change looks — that's
  always a human decision.
- After opening a PR, always ask whether to monitor it (e.g. CI status) — don't start
  unprompted, don't skip asking.

## Visibility

Before creating or committing any file: would a stranger picking up this repo cold
find it useful, or need it? If no, it doesn't belong in a committed file — see
`.policy/visibility.md`. Durable-but-personal content goes in `CLAUDE.local.md`
(gitignored); anything not yet settled stays in session/project memory until it's an
actual decided policy, not this file.
