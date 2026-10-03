# Branch Protection Policy

## Ruleset

**BP-1**: `main`'s branch protection MUST be defined as a checked-in ruleset (a GitHub repository ruleset exported as JSON), not as configuration that exists only inside GitHub's UI.

Rationale: `github.md`'s "Who merges" section (GH-6/GH-7) holds that where the platform supports a real technical gate, it should exist — not just be trusted to be followed.

## Why this isn't part of the compliance audit

**BP-2**: Applying or changing BP-1's ruleset MUST be done by the maintainer directly, in their own already-authorized broader-scoped session — never by an agent session, regardless of what credentials that session holds. Reading/verifying its current state MAY be done by an agent session, provided the PAT it's using carries `administration:read`.

Rationale: writing branch-protection state is exactly the kind of hard-to-reverse, repo-wide change the least-privilege PAT stance in `git.md` exists to keep out of an agent's reach, so that stays maintainer-only regardless of what any single PAT happens to carry. Reading it is lower-risk and no longer needs to be withheld on principle once the PAT a session is using actually carries `administration:read` — the day-to-day PAT didn't at first, but the maintainer may grant it later, same as happened here. CI's own token (used by the automated `compliance-audit.md` check) is a separate credential that still lacks it entirely, which is why [`compliance-audit.md`](compliance-audit.md) (CA-7) excludes this obligation from that automated check specifically — not because verification is inherently impossible, only because that one credential doesn't carry it.
