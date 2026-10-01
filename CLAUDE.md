# CLAUDE.md

Agent-operational form of this repo's process policies. `CONTRIBUTING.md` is the
human-readable narrative of the same rules; `.policy/*.md` are the underlying
policies with their rationale. This file exists specifically so these rules persist
across sessions without depending on this conversation or on Claude's own memory
system staying intact.

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
- Trunk-Based Development: `main` is the only long-lived branch. Never create or
  propose a second long-lived branch (`develop`, a release branch, etc.) — route
  everything through a short-lived worktree branch and a PR instead.
- Release tags are cut automatically from qualifying merges to `main` — no manual
  release step, no separate release branch/PR. Whatever tool implements this (CA-1)
  must only push tags, never a commit back to `main`, or it'll conflict with branch
  protection. They're for self-hosters to pin to, not a gate on the maintainer's own
  deployment: don't wire anything that makes the maintainer's own Vercel production
  deploy wait on a release tag being cut — it already deploys continuously from `main`
  HEAD, gated by the PR review each merge went through.

## GitHub

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

## Process compliance

- Don't hand-maintain status of Development Practices bullets anywhere (memory, docs,
  comments) — `process-hygiene`-labeled GitHub issues are the only source of truth for
  what's currently unmet. See `.policy/compliance-audit.md`.
- Branch protection for `main` is managed via a checked-in ruleset file. Changing or
  applying it is always the maintainer's own broader-scoped session — never attempt
  that with this repo's day-to-day credentials. Reading/verifying its current state
  is fine with day-to-day credentials, provided the PAT in use actually carries
  `administration:read`. See `.policy/branch-protection.md`.

## Visibility

Before creating or committing any file: would a stranger picking up this repo cold
find it useful, or need it? If no, it doesn't belong in a committed file — see
`.policy/visibility.md`. Durable-but-personal content goes in `CLAUDE.local.md`
(gitignored); anything not yet settled stays in session/project memory until it's an
actual decided policy, not this file.
