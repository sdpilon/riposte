---
name: policy-sync
description: Check whether CONTRIBUTING.md and CLAUDE.md still accurately reflect .policy/*.md, and propagate any changes to a policy file into its two implementation layers. Use this any time a file under .policy/ was just edited, before finishing a task that touched one, or when the user asks to check the docs are consistent, that CLAUDE.md/CONTRIBUTING.md match policy, or generally "sync the docs" / "check for drift" / "did I miss updating something." This kind of mismatch is silent and no test will ever catch it, so lean toward running this proactively after any .policy/ edit rather than waiting to be asked.
---

# Syncing policy layers

`.policy/*.md` is the source of truth for *what the rule is*. `CONTRIBUTING.md`
and `CLAUDE.md` are derived from it — a human-facing narrative and an
agent-operational form of the same rules. When a policy file changes and its two
derived sections don't get updated in the same breath, the repo ends up with two
different answers to "what's the rule" and nothing will ever flag that on its own —
no test fails, no lint catches it. That's the entire reason this skill exists: it's
checking for a category of error that's invisible unless someone (or something) goes
looking.

## How to find what should match what

Each `.policy/<topic>.md` is referenced from `CONTRIBUTING.md` and `CLAUDE.md`
via a markdown link (e.g. `[.policy/git.md](.policy/git.md)` or
`.policy/visibility.md`). Use those links to build the correspondence — the
section(s) in `CONTRIBUTING.md`/`CLAUDE.md` that link to a given policy file are the
ones that should agree with it.

For each policy file, check three directions:

1. **Policy → implementation drift.** Does `CONTRIBUTING.md`/`CLAUDE.md` still
   correctly restate the current policy? If the policy file's rule changed (a
   condition was added, an exception was removed, wording that changes the actual
   rule rather than just prose), does the derived section still match?
2. **Dangling references.** Does `CONTRIBUTING.md`/`CLAUDE.md` reference something
   the policy file no longer says — a removed exception, a deleted section, a
   condition that used to apply and doesn't anymore? `CLAUDE.md`'s "Current phase"
   section is the clearest example in this repo: it names exactly what else needs
   editing when it's deleted (a parenthetical in `CLAUDE.md`'s own `## GitHub`
   heading, a sentence in `.policy/github.md`, a parenthetical in
   `CONTRIBUTING.md`). If you're running this skill because that phase just ended,
   follow its own listed steps directly rather than treating it as generic
   drift-checking.
3. **Missing coverage.** Is there a `.policy/<topic>.md` file with no
   corresponding section in `CONTRIBUTING.md` or `CLAUDE.md` at all — meaning it was
   added without going through the full three-layer process (see `policy-add`)?

Also check the reverse direction once: is there a rule stated in `CONTRIBUTING.md` or
`CLAUDE.md` that has no backing policy file — something that was added directly to an
implementation layer, skipping the invariant layer entirely? That's a sign
`policy-add`'s process wasn't followed and the rule may need a proper
`.policy/` home.

## Not every rule needs a mirror in every layer

Before flagging a rule as missing from `CONTRIBUTING.md` or `CLAUDE.md`, check
whether it actually has something meaningful to say to that audience — some rules are
legitimately scoped to only one side of the human/agent split. `.policy/github.md`'s
"Who merges" section already does this on purpose (it explicitly contrasts human vs.
automation rather than stating one flat rule). A rule like "an agent must check
before monitoring a PR it opened" has no real human-facing translation: a human
contributor watching their own PR isn't asking anyone's permission, so there's no one
to ask. Forcing a parallel sentence into the other layer anyway produces something
that's technically present but doesn't make sense to that audience — worse than
leaving it out, since it looks like coverage was checked when it wasn't actually
thought through.

The test: could you write a version of this rule for the other audience that tells
them something they'd actually need to know and act on? If yes, it's a real gap —
write it. If the honest answer is "there's nothing to say, this only applies because
of the specific human-directs-agent relationship," that's not missing coverage — and
the policy file itself should say so explicitly (so the scoping reads as deliberate,
not as an oversight), rather than have the rule padded into a layer where it doesn't
belong.

## Reporting and applying

List every mismatch you find as a specific, concrete diff — quote the current text
and the proposed replacement, don't just describe the discrepancy in the abstract.
Present the full list and wait for a go-ahead before writing anything; propagating an
already-decided policy into other layers still means editing files, and the user gets
to see exactly what's about to change before it does.

Once approved, apply the edits and commit per `.policy/git.md` (one logical
change — a sync pass across several files for one underlying cause is still one
commit) and `.policy/github.md` (check `CLAUDE.md`'s "Current phase" section for
whether a PR is currently required).

If you find zero mismatches, say so plainly — a clean sync check is a useful result,
not a non-event.
