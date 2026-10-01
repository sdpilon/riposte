# Branch Protection Policy

**BP-1**: `main`'s branch protection MUST be defined as a checked-in ruleset (a
GitHub repository ruleset exported as JSON), not as configuration that exists only
inside GitHub's UI.

Rationale: `engineering-practices.md`'s "CI, deploys, and verification" section and
`github.md`'s "Who merges" section both hold that where the platform supports a real
technical gate, it should exist — not just be trusted to be followed.

## Why this isn't part of the compliance audit

**BP-2**: Applying or verifying BP-1 MUST be done by the maintainer directly, in
their own already-authorized broader-scoped session — never by an automated check.

Rationale: reading or applying branch-protection state requires GitHub's
`administration:read` (or broader) permission, which the fine-grained,
least-privilege PAT `git.md` mandates deliberately does not carry.
[`compliance-audit.md`](compliance-audit.md) (CA-7) excludes this obligation outright
rather than treating "couldn't verify" as "passing."
