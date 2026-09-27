# GitHub Policy

## When a pull request is required

**Once real application code exists, every commit goes through a pull request — no
exceptions by file type.** A one-line doc fix goes through a PR exactly like
application code does. Until then (the current docs-only phase), commits go straight
to `main` — see `CLAUDE.md` for the live status of that interim exception and what
ends it.

Rationale: Constitution Development Practices already commits to "a branch-protected
trunk with CI-required pull requests from day one, ... even for the person building it
alone." Carving out a docs-only exception once code exists would just be a second,
unenforced convention sitting next to the enforced one — real branch protection is
binary at the repo level, so the policy should be too.

## Checks before opening a PR

**The full local quality gate — type-checking, linting, formatting, tests — must pass
locally before a PR is opened, using the same commands CI runs.** "It'll probably pass
CI" is not a substitute for actually running the gate.

## Pull request descriptions

**Every PR description is drafted from the repo's own template
(`.github/PULL_REQUEST_TEMPLATE.md`), filled in section by section against what
actually changed — never freeform,** even when a freeform paragraph feels like it
covers the same ground. Write the body to a temp file and pass it via `--body-file`
rather than an inline heredoc.

## Who merges

**A human merges every pull request, always — never automation, regardless of how
trivial the change looks or how green CI is.** Where the platform supports it, this is
also a technical gate (required review from an identity distinct from whatever opened
the PR), not just a written instruction an agent is trusted to follow.

Rationale: see `engineering-practices.md`'s "CI, deploys, and verification" section —
a passing build is not proof the app works, and merge authority is a human judgment
call the tooling shouldn't be trusted to make on its own.

## After opening a PR

Always ask whether the PR should be monitored (e.g. for CI status) — never start
monitoring unprompted, and never skip asking either.
