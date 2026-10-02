# GitHub Policy

## When a pull request is required

**GH-1**: Every commit MUST go through a pull request — no exceptions by file type.
A one-line doc fix goes through a PR exactly like application code does. This says
nothing about how many commits a PR carries: a single PR MAY hold just one commit or
several batched together, whether or not those commits are related to each other —
the only constraint is that each individual commit still satisfies GIT-1 (one
logical, coherent change) on its own. The obligation is that no commit reaches
`main` outside a PR, never a constraint on PR-to-commit cardinality in either
direction.

Rationale: Constitution Development Practices already commits to "a branch-protected
trunk with CI-required pull requests from day one, ... even for the person building it
alone." Real branch protection is binary at the repo level, so the policy is too.
Batching several commits into one PR — related or not — is a legitimate way to cut
merge overhead (one CI run, one preview deploy, one manual merge instead of several)
without weakening that gate, but it's an option, not a requirement — a single-commit
PR is just as compliant as a batched one.

## Opening a PR is its own authorization

**GH-2**: Pushing a branch MUST NOT be treated as authorization to open a pull
request for it — opening a PR is always its own, separate decision.

Rationale: same shape as "Who merges" below — each step that could advance or
publish work needs its own explicit go, not authorization inherited from the step
before it.

## Checks before opening a PR

**GH-3**: The full local quality gate — type-checking, linting, formatting, tests —
MUST pass locally, using the same commands CI runs, before a PR is opened. "It'll
probably pass CI" is not a substitute for actually running the gate.

## Pull request descriptions

**GH-4**: Every PR description MUST be drafted from the repo's own template
(`.github/PULL_REQUEST_TEMPLATE.md`), filled in section by section against what
actually changed — never freeform, even when a freeform paragraph feels like it
covers the same ground.

**GH-5**: A PR body MUST be written to a temp file and passed via `--body-file`,
never an inline heredoc.

## Who merges

**GH-6**: A human MUST merge every pull request, always — never automation,
regardless of how trivial the change looks or how green CI is.

**GH-7**: Where the platform supports it, merge approval SHOULD also be a technical
gate (required review from an identity distinct from whatever opened the PR), not
only a written instruction trusted to be followed.

Rationale: see `engineering-practices.md`'s "CI, deploys, and verification" section —
a passing build is not proof the app works, and merge authority is a human judgment
call the tooling shouldn't be trusted to make on its own.

## After opening a PR

**GH-8**: An agent that opens a PR MUST NOT begin monitoring it without asking
first — that's checked for explicitly, never started unprompted.

Rationale: a human contributor watching their own PR isn't asking anyone's
permission; this specifically governs automation acting on someone else's behalf,
not a rule every audience needs its own version of.
