<!--
Sync Impact Report
- Version change: 1.2.0 → 1.3.0
- Modified principles: none renamed or redefined
- Modified sections:
  - Development Practices: replaced 8 inline bullets with a pointer to
    .policy/compliance-audit.md (CA-1..CA-7) and .policy/branch-protection.md
    (BP-1, BP-2), which now own this content with a real, ongoing compliance
    mechanism (a CI-driven audit for self-checkable obligations, plus a
    human-verified checked-in ruleset for branch protection) — the inline
    prose had no equivalent to Principles' Compliance Review and had already
    drifted from repo state by the time this was caught (2 known gaps plus 2
    more found via an unprompted audit).
  - Governance / Compliance review: removed an incorrect citation ("per
    Principle IV (\"Development Practices\")" — Principle IV is actually
    "Minimal Setup Friction, Smart Defaults"; Development Practices was never
    a numbered Principle). Added a sentence naming the separate mechanism
    that now checks Development Practices obligations, so the gap this
    citation bug helped obscure doesn't reopen silently.
- Added sections: none
- Removed sections: none (Development Practices retained as a section, content
  relocated)
- Templates requiring updates: none checked in this run — dependent
  templates/commands read this file at runtime and are out of scope for
  /speckit-constitution itself.
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

Foundational engineering practices — quality gates, release automation, self-host
packaging, security hardening, and related process hygiene — are defined and kept
current in this repo's `.policy/` layer, not duplicated here:
[`.policy/rule/`](../../.policy/rule/) (rules 001–010: the branch-protection and
compliance-audit obligations). `process-hygiene`-labeled GitHub issues are the live record of what's
currently unmet — never restated here.

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
principles before implementation begins (not retrofitted after). Any complexity or
exception that appears to conflict with a principle MUST be justified explicitly in
the relevant plan, or the plan MUST be revised instead. Development Practices
obligations are checked separately and on an ongoing basis —
`.policy/rule/`'s rules 003–010 (CI-driven audit) and 001–002 (human-verified
checked-in ruleset) — not via
this per-feature review.

**Version**: 1.3.0 | **Ratified**: 2026-09-25 | **Last Amended**: 2026-09-30
