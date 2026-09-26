<!--
Sync Impact Report
- Version change: 1.1.0 → 1.2.0
- Modified principles: none renamed
- Added sections:
  - Development Practices: new bullet, "A committed-vs-personal boundary is
    decided from day one, not discovered through friction" — promoted from a
    lesson in repo-rater's own project memory (not engineering-practices.md or
    tool-notes.md). Repo-rater's unclear boundary between tracked project docs
    and untracked personal-process docs (CLAUDE.md vs CLAUDE.local.md,
    settings.json vs settings.local.json) was one of three named frustrations
    that triggered rebuilding as riposte in the first place, but the lesson
    itself was never distilled into a portable principle until now.
- Removed sections: none
- Templates requiring updates: none checked in this run — dependent templates/commands
  read this file at runtime and are out of scope for /speckit-constitution itself.
- Follow-up TODOs: none.
-->

# Riposte Constitution

Riposte measures whether each project in a GitHub account is actually converging on
what it says it set out to do — not another activity dashboard, a progress-vs-intent
one. It reads a repo's own stated goals (its README) against its real, ongoing
evidence (commits, issues, pull requests) and renders an honest, evidence-based
verdict.

## Core Principles

### I. Self-Hosted, Single-User by Default

The person running this instance controls their own data, their own credentials, and
their own database. There is no hosted service standing between them and their
GitHub account. Each deployment serves exactly one deployer, one GitHub account, and
one set of credentials — no accounts system, no per-user permissions, no shared
multi-tenant state.

Rationale: this is a personal tool, not a SaaS product; multi-tenancy and hosted
custody of a user's GitHub access would contradict the reason someone would trust it
with their account in the first place.

### II. Evidence-Grounded Assessments

A verdict is never a vibe. Every progress assessment MUST be grounded in specific,
real evidence — actual commits, issues, and pull requests — checked against what the
repository's own README says it is trying to do.

Rationale: the entire value of the tool over a generic activity dashboard is that its
conclusions are traceable to evidence a person can independently verify.

### III. Read-Only Against GitHub (NON-NEGOTIABLE)

This tool observes; it MUST NOT write back to a user's repos, issues, or pull
requests, under any feature, present or future.

Rationale: a tool that assesses someone's projects has no legitimate need to mutate
them. Keeping the tool strictly read-only bounds its blast radius and the credential
scope it ever needs to request.

### IV. Minimal Setup Friction, Smart Defaults

Getting from "nothing running" to "seeing real assessments" MUST take as few
decisions and as little required configuration as possible. Where a sensible default
exists (what to ignore, when to re-run), the tool picks it automatically and lets the
person override it, rather than asking upfront.

Rationale: a self-hosted personal tool that's tedious to stand up simply won't get
used, no matter how good its assessments are.

### V. Cheap, Automatic Re-Assessment

The tool MUST NOT re-do expensive work (an AI assessment) on something that hasn't
meaningfully changed. Staying current MUST NOT mean staying expensive.

Rationale: assessments are meant to be re-run continuously as projects evolve;
unconditionally re-running the expensive step would make ongoing use costly enough
to discourage the behavior the tool exists to support.

### VI. Credential-Free Demo Is First-Class

Anyone MUST be able to see what this actually looks like and does without creating
accounts, entering API keys, or connecting a real GitHub account first. The demo path
is designed in alongside the real one, not bolted on afterward for marketing.

Rationale: evaluating the tool shouldn't require trusting it with real credentials
first — that's a chicken-and-egg barrier to adoption for exactly the audience this
tool is for.

### VII. No LLM Provider Lock-In (NON-NEGOTIABLE)

Which model or provider performs the assessment is an implementation decision made
later, not a constraint on the product itself. No principle, feature, or piece of
code may assume a specific LLM vendor.

Rationale: keeps the assessment engine swappable as models and pricing change,
without that choice becoming entangled with the product's identity or architecture.

### VIII. Credentials Belong to the Operator (NON-NEGOTIABLE)

No account handles credentials on the tool's behalf. Whatever credentials the
assessment needs (a GitHub token, an LLM API key) belong to and are supplied by the
person running their own instance.

Rationale: direct consequence of Principle I (self-hosted by default) — credential
custody by anyone other than the operator would reintroduce the hosted-service trust
model this tool exists to avoid.

## Development Practices

- **An automated quality gate blocks every merge from day one** — type-checking,
  linting, formatting, and tests, run the same way locally and in CI, before there's
  meaningful code for it to have caught up to.
- **A branch-protected trunk with CI-required pull requests from day one.** No
  direct pushes to the main line, even early, even for the person building it alone.
- **Release and versioning are automated from early on.** Version bumps and
  changelogs come from commit history, not a manually-remembered tagging ritual that
  someone has to recall how to do correctly months later.
- **Self-host packaging is designed in alongside the primary deployment, not
  retrofitted after.** A from-scratch self-hoster's path to running this should be a
  first-class concern from early in the project, not something addressed once the
  maintainer's own instance already works a different way.
- **Security-relevant hardening is a day-one requirement, not an audit finding.**
  Anywhere the tool renders untrusted external content (a repo's README) or handles
  credentials, the hardening work happens when that feature is built, not after a
  gap is later discovered.
- **A fake-data / demo path exists from early on.** The product should be evaluable
  — by the builder, and by anyone else — without live credentials, from early in
  development, not added late once real usage already depends on real credentials.
- **Audit for hardcoded personal-identity strings, not just secrets.** A username,
  account handle, or email baked directly into UI text or a default value undermines
  the self-hosted and credential-free-demo commitments (Principles I, VI) even when
  no actual secret is exposed — it silently deanonymizes the original author on an
  instance meant to be someone else's, or a demo meant to hold no one's real data.
- **A committed-vs-personal boundary is decided from day one, not discovered
  through friction.** What's tracked in the repo is project knowledge anyone
  self-hosting or collaborating needs; personal process, machine-specific tooling,
  and individual credential-wrapping habits stay in gitignored local-only files
  from the start (e.g., a local-only settings/config split), not retrofitted after
  they've already tangled together.

## Success Criteria

Someone looking at this tool's output should be able to tell, within seconds and
without reading each repo themselves, which of their projects are actually
converging on what they set out to build and which have stalled or drifted — and be
able to see *why*, in evidence, not just a number.

## Governance

This constitution supersedes all other project practices and documents; where any
other doc (README, plan, task list) conflicts with it, this document wins until
amended.

**Amendment procedure**: propose the change, state which principle(s) or section(s)
it affects, and update this file directly (this is a single-maintainer project — no
separate approval body). A change to any principle marked NON-NEGOTIABLE MUST be a
deliberate, explicit decision, not a side effect of unrelated work.

**Versioning policy**: this document is versioned independently of the product,
using semantic versioning:
- MAJOR — backward-incompatible governance/principle removals or redefinitions.
- MINOR — a new principle or section added, or materially expanded guidance.
- PATCH — clarifications, wording, typo fixes, non-semantic refinements.

**Compliance review**: every feature or plan MUST be checked against these
principles before implementation begins (not retrofitted after), per Principle IV
("Development Practices") of this constitution. Any complexity or exception that
appears to conflict with a principle MUST be justified explicitly in the relevant
plan, or the plan MUST be revised instead.

**Version**: 1.2.0 | **Ratified**: 2026-09-25 | **Last Amended**: 2026-09-26
