# Git Policy

## Commits

**One logical change per commit.** A commit is a single coherent, reviewable unit —
never a grab-bag of unrelated edits, never split so finely that one idea is smeared
across several commits.

Rationale: a commit is the smallest unit a future reader (human or agent) can
understand, review, or revert in isolation. Bundling unrelated changes together, or
fragmenting one change into many, both break that.

**Commit messages use Conventional Commits style** (`type(scope): summary`), kept to a
single line unless a body is genuinely necessary.

## Worktrees and branches

**Any change destined for a branch and a PR gets its own worktree.** Isolation from
whatever else is in progress, and a clean removal path once merged. A trivial
direct-to-main edit — while that's still permitted, see [`github.md`](github.md) —
doesn't need one.

**No branch or worktree outlives its merged PR.** Deleting both is part of the same
action as merging, never a separate cleanup step, never left "just in case." The
expected end state after any completed piece of work is a clean `main` — up to date
with `origin/main`, nothing to commit, no stray branches or worktrees.

## Adding new files

**Ask before adding a new top-level or structural file** (a new top-level doc, a new
config file, a new directory convention). A file that's obviously part of already-
approved work — a new component, a new test file for a feature already being built —
doesn't need a separate ask.

Rationale: structural files shape how everyone (human or agent) navigates the repo
afterward; a silent choice here is much harder to undo cleanly than a silent choice
inside an already-scoped piece of work.

## Authentication

**Git and GitHub operations use only the operator's own ambient credentials** —
whatever's already configured on their machine (an SSH key, `gh auth login`) — never a
credential embedded in the repo, a repo-local script, or a personal alias the repo
depends on to function.

Rationale: a project meant to be self-hosted has to work for someone who's never heard
of the original maintainer's personal credential-wrapping setup. See
`engineering-practices.md`'s "Credential and access scoping" section for the incident
this generalizes from.
