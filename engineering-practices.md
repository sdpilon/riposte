# Engineering practices

Tool-agnostic reasoning behind `.specify/memory/constitution.md`'s "Development
Practices" — not new commitments, but the _why_, with a concrete example of what
goes wrong without each one. Mined from what actually happened building
repo-rater: real incidents, real decisions, real bugs. Nothing here names
a specific language, framework, or database — see `tool-notes.md` for the
tool-specific version of some of these same lessons.

## Credential and access scoping

**Scope credentials around what actually prevents irreversible damage,
not around call-time friction.** A token split into narrower per-task
pieces, each requiring its own approval step before use, feels safer than
one consolidated token — but if neither piece could ever reach an
admin-level action anyway, the split isn't buying additional protection,
just friction. What actually prevents irreversible damage is the
_absence of admin-level capability_ (can't rewrite history, can't change
access, can't delete) combined with a structural safeguard at the
repository level (like required review before merge). Once those two are
in place, a single reasonably-scoped credential is fine — the extra
approval ceremony around every individual call was solving a problem
that a scoping decision, made once, already solved.

**Personal secret-injection tooling belongs in the maintainer's own
shell configuration, never inside a repo's own scripts.** A project
meant to be self-hosted has to work for someone who has never heard of
your personal credential-wrapping setup. If a `package.json` script (or
equivalent) only works when wrapped in a personal alias, that's a
self-hosting bug, not a convenience.

**When automation opens pull requests, the merge-review gate needs an
identity distinct from the maintainer's own account.** Most git hosts
block a PR author from approving their own PR — but that block is keyed
to the _account_, not the _credential_. A second personal-access-token
on the same account doesn't create a second identity for review
purposes; the platform still sees the same author. If a required-review
merge gate is meant to be a real technical control (not just a written
policy an agent is trusted to follow), the thing opening automated PRs
needs to authenticate as a genuinely separate identity — a dedicated
bot/app account or equivalent, not a second token on the human's own
account.

## CI, deploys, and verification

**A passing build is not proof the app works.** A build can succeed
while the deployed result 500s on every request — a missing runtime
file, an unapplied migration, an environment difference between build
time and request time. If nothing after the build actually loads the
live result and confirms it renders, "CI is green" only means "it
compiled," not "it works." A real smoke test — hit the live deployed
URL, confirm it returns real content and not an error page — belongs in
the required-checks gate, not as an optional nice-to-have.

**Automation should never merge, regardless of how trivial the change
looks or how green CI is.** That authority is a human's, always. Where
the platform allows it, make this a _technical_ gate (required review
from an account distinct from whatever opens the PR), not just a written
instruction an agent is trusted to follow — written policy is real, but
a technical gate doesn't depend on anyone remembering to follow it.

**A manual release-batching branch that produces no changelog or version
history is strictly worse than release automation doing the same job
directly on the trunk.** A staging-style branch that exists purely to
batch several changes before a manual promotion step is a real, easy to
forget, ceremony — and produces nothing (no version bump, no changelog)
that a proper release-automation tool watching the trunk directly
wouldn't produce with zero manual steps. If the only reason for a second
long-lived branch is batching, an automated release process on the
trunk itself replaces it entirely, not just partially.

**Mark work complete only once it's actually landed, not once a PR
exists for it.** Work living only on an unmerged branch isn't done yet,
even if every commit for it exists somewhere. Whatever tracks "is this
finished" should reflect merged state, not proposed state.
<!-- or change it to some other state that shows that it's technically complete but not yet merged -->

## Data and query design

**An append-only table that embeds large denormalized content on every
row will blow up read-path cost unless "get the current one" is filtered
in the query itself.** Keeping full history (never overwriting, always
inserting a new record) is a good pattern — but if each historical row
also carries a full copy of some large piece of content (a full document
snapshot, say), and the code that wants "the current version" fetches
every historical row and picks the latest one in application code, every
read pulls the _entire_ history's worth of that large content across the
wire, growing forever. The "latest per key" filtering has to happen in
the query itself (a `DISTINCT ON`/window-function pattern, or
equivalent) before the data leaves the database, not after.

**A demo or preview environment's data should refresh itself on deploy,
not depend on a manual step someone will eventually forget.** If a
demo's fixture/seed data can drift from what the seed script actually
produces, wire the seeding into the deploy/build process itself so every
deploy is self-consistent, rather than documenting "remember to reseed
after changing the fixtures."

## Self-hosting and open-source hygiene

**Audit for hardcoded personal-identity strings, not just secrets.** A
username, an account handle, an email baked directly into UI text or a
default value is a real leak for anything meant to be self-hosted or
shown as a public demo with someone else's (or fake) data — it silently
deanonymizes the original author even when nothing else about the
instance is theirs. A pass that only looks for hardcoded _secrets_ will
miss this category entirely; it needs its own check.

**A fixture that's meant to prove a resolution/linking feature works
needs a real, live target to resolve against.** A plausible-looking fake
path (a URL, a file reference) can pass code review and even "look
right" in a screenshot, but can't actually verify the resolution logic
reaches something real — only a genuinely live target can. If a feature
depends on resolving external references correctly, back any fixture
that exercises it with something that actually exists.

## Documentation and tracker discipline

**Ground documentation claims in the actual current source or behavior,
not in what a prior version of the docs said.** Prior docs can be stale,
or simply wrong — paraphrasing them forward just propagates the error.
For anything beyond a trivial fix, read the real, current implementation
before writing the sentence that describes it.

**For any doc rewrite of real consequence, draft section-by-section and
get explicit approval before committing each part to the file**, rather
than writing the whole thing and presenting it as a fait accompli.
Catches misunderstandings while they're cheap to fix.

**A doc's location should signal its relevance to a first-time reader,
not just its nesting depth.** A doc that's genuinely historical (about
code that no longer exists, a decision that's been superseded) should
live somewhere whose _path_ says so — an explicit `retired/`-style
location with its own short explanation, not just one directory level
deeper where a reader has no way to know to skip it. Directory names
should also be plain and descriptive, never named after whatever tool
or process happened to author them — a name like that only makes sense
to someone who already knows the tooling.

**Keep a structural boundary between internal/personal tracking and
anything public-facing — a one-time manual port, not an ongoing
automatic sync.** If an internal tracker holds a mix of genuinely
public-facing work and things that have no business being visible
(infra notes, personal process decisions), an automatic sync — even one
scoped by a label or tag — depends on remembering to apply that
label/tag correctly, forever, without exception. A single failure to
label something correctly is a silent leak. Porting public-facing items
across by hand, once, when they're ready to be public, removes the
ongoing risk entirely at the cost of a small amount of manual effort.

## Debugging technique

**To debug a serverless/edge function that hangs with no clean error,
reproduce it by invoking the built output's exported request handler
directly in local Node**, bypassing the actual deploy platform entirely.
A bundler's lazy-loading chain can swallow an exception that would
otherwise be a clean stack trace, leaving only a hung response with no
visible error on the platform's own side — but the built artifact itself
usually exports a plain function that can be called directly, with a
normal Node stack trace, no live deploy cycle needed to iterate.

## UI and domain-model consistency

**When a UI control's displayed labels diverge in polarity from the
underlying domain model, it reads backwards to users.** If a toggle is
displayed as answering one question ("should this be included?") but the
code underneath models the opposite question ("should this be
excluded?"), the two poles get inverted somewhere and the control ends
up doing the opposite of what its own label implies. Worth checking
explicitly, not just assuming label and storage agree, anywhere a
control's affirmative state doesn't obviously match its stored boolean's
name.
