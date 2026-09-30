# Git Policy

## Commits

**GIT-1**: Commits MUST represent one logical, coherent, reviewable change — never a
grab-bag of unrelated edits, never split so finely that one idea is smeared across
several commits.

**GIT-2**: Commit messages MUST use Conventional Commits style (`type(scope):
summary`), kept to a single line unless a body is genuinely necessary.

Rationale: a commit is the smallest unit a future reader (human or agent) can
understand, review, or revert in isolation. Bundling unrelated changes together, or
fragmenting one change into many, both break that.

## Worktrees and branches

**GIT-3**: Any change destined for a branch and a PR MUST get its own worktree.

**GIT-4**: A branch or worktree MUST NOT outlive its merged PR — deleting both is
part of the same action as merging, never a separate cleanup step, never left "just
in case."

Rationale: the expected end state after any completed piece of work is a clean
`main` — up to date with `origin/main`, nothing to commit, no stray branches or
worktrees.

## Adding new files

**GIT-5**: A new top-level or structural file (a new top-level doc, a new config
file, a new directory convention) MUST be confirmed with the user before it's added.
A file that's obviously part of already-approved work — a new component, a new test
file for a feature already being built — doesn't need a separate ask.

Rationale: structural files shape how everyone (human or agent) navigates the repo
afterward; a silent choice here is much harder to undo cleanly than a silent choice
inside an already-scoped piece of work.

## Authentication

**GIT-6**: Git and GitHub operations MUST use only the operator's own ambient
credentials (whatever's already configured on their machine — an SSH key, `gh auth
login`) and MUST NOT depend on a credential embedded in the repo, a repo-local
script, or a personal alias.

Rationale: a project meant to be self-hosted has to work for someone who's never
heard of the original maintainer's personal credential-wrapping setup. See
`engineering-practices.md`'s "Credential and access scoping" section for the
incident this generalizes from.
