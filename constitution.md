# Constitution

Durable principles for this project. These describe *why* it exists and
*how* it should be built, not what it currently does feature-by-feature —
that's `spec.md`. This document should rarely change; when it does, it's
because a genuine value or hard constraint changed, not because a feature
shipped.

## Purpose

Most tools that summarize a GitHub account measure activity — commit
counts, recency, contributor graphs. This one measures something
different: whether each project is actually converging on what it says it
set out to do. It reads a repo's own stated goals (its README) against
its real, ongoing evidence (commits, issues, pull requests) and renders an
honest, evidence-based verdict — not another activity dashboard, a
progress-vs-intent one.

## Core principles

- **Self-hosted by default.** The person running this controls their own
  data, their own credentials, and their own database. There is no hosted
  service standing between them and their GitHub account.
- **Single-user, personal tool.** One deployer, one GitHub account, one set
  of credentials per instance. No accounts system, no per-user permissions,
  no shared multi-tenant state.
- **Assessments must cite evidence.** A verdict is never a vibe. Every
  progress assessment is grounded in specific, real evidence — actual
  commits, issues, and pull requests — checked against what the repo's own
  README says it's trying to do.
- **Read-only against GitHub.** This tool observes; it never writes back
  to a user's repos, issues, or pull requests.
- **Minimal setup friction, smart defaults.** Getting from "nothing
  running" to "seeing real assessments" should take as few decisions and
  as little required configuration as possible. Where a sensible default
  exists (what to ignore, when to re-run), the tool picks it automatically
  and lets the person override it, rather than asking upfront.
- **Re-assessment is cheap and automatic.** The tool should never re-do
  expensive work (an AI assessment) on something that hasn't meaningfully
  changed. Staying current should not mean staying expensive.
- **A credential-free demo is a first-class citizen.** Anyone should be
  able to see what this actually looks like and does without creating
  accounts, entering API keys, or connecting a real GitHub account first.
  The demo path is not an afterthought bolted on for marketing.

## Development goals

These are engineering practices this project commits to having in place
early, not practices to retrofit once the codebase already exists without
them.

- **An automated quality gate blocks every merge from day one** —
  type-checking, linting, formatting, and tests, run the same way locally
  and in CI, before there's meaningful code for it to have caught up to.
- **A branch-protected trunk with CI-required pull requests from day
  one.** No direct pushes to the main line, even early, even for the
  person building it alone.
- **Release and versioning are automated from early on.** Version bumps
  and changelogs come from commit history, not a manually-remembered
  tagging ritual that someone has to recall how to do correctly months
  later.
- **Self-host packaging is designed in alongside the primary deployment,
  not retrofitted after.** A from-scratch self-hoster's path to running
  this should be a first-class concern from early in the project, not
  something addressed once the maintainer's own instance already works a
  different way.
- **Security-relevant hardening is a day-one requirement, not an
  audit finding.** Anywhere the tool renders untrusted external content
  (a repo's README) or handles credentials, the hardening work happens
  when that feature is built, not after a gap is later discovered.
- **A fake-data / demo path exists from early on.** The product should be
  evaluable — by the builder, and by anyone else — without live
  credentials, from early in development, not added late once real usage
  already depends on real credentials.

## Non-negotiables

- **Never writes back to GitHub.** No mutating a user's repos, issues, or
  pull requests, under any feature.
- **No specific LLM provider is assumed here.** Which model or provider
  performs the assessment is an implementation decision made later, not a
  constraint on the product itself.
- **No account handles credentials on the tool's behalf.** Whatever
  credentials the assessment needs (a GitHub token, an LLM API key) belong
  to and are supplied by the person running their own instance.

## Success criteria

Someone looking at this tool's output should be able to tell, within
seconds and without reading each repo themselves, which of their projects
are actually converging on what they set out to build and which have
stalled or drifted — and be able to see *why*, in evidence, not just a
number.
