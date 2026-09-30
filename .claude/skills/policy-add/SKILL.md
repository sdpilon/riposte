---
name: policy-add
description: Add a new process/procedure policy to this repo — creates .policy/<topic>.md (the invariant rule + rationale) and writes matching sections into CONTRIBUTING.md (human-facing) and CLAUDE.md (agent-facing), so all three layers stay consistent from the moment a policy exists. Use this whenever the user wants to add, define, write down, or formalize a new project policy, procedure, convention, or house rule for this repo — including phrasing like "we should have a rule about...", "let's decide how we handle...", "add a procedure for...", or "what's our policy on..." — even when they don't say the word "policy" explicitly. If it's unclear whether the proposed rule belongs in the repo at all versus being personal preference, use policy-judge first, then come back here once it's confirmed as policy.
---

# Adding a policy

This repo splits process rules into three layers, and every policy topic needs all
three kept in sync from the start:

1. **`.policy/<topic>.md`** — the invariant rule and *why* it exists, written at
   a level that makes sense regardless of who or what is carrying it out. Same altitude
   as a constitution principle + rationale, but for process rather than product.
2. **`CONTRIBUTING.md`** — the human-readable narrative version, referencing the
   policy file for full rationale rather than restating it.
3. **`CLAUDE.md`** — the agent-operational version: the same rule, phrased as
   something an agent can act on directly, also referencing the policy file.

Read the existing files in `.policy/` before writing a new one — they're the
style guide. Notice the pattern: obligations as `<PREFIX>-N: <subject> MUST/SHOULD/
MUST NOT/MAY <requirement>`, one sentence each, grouped into `##` sections, each
section followed by a short "Rationale:" paragraph explaining what actually breaks
without it (not just "because I said so"). Match that tone; don't invent a new format
for the new topic.

## Before writing anything

Confirm the topic and its actual scope. If the user's request is already crisp (a
clear rule, a clear reason), you don't need to interview them further — draft
directly. If it's a rough idea ("we should have some kind of policy about deploys"),
ask clarifying questions one at a time, the way this repo's policies were originally
built: what's the actual rule, why does it matter, what's the failure mode without it.
Prefer multiple-choice questions when there's a natural set of options.

Then apply the same test `.policy/visibility.md` uses for anything else that
might go in this repo: **would this be useful to a stranger picking up the repo cold**
— any future contributor or agent, not just the person asking right now? If the
answer feels like "no, this is really about how *I* like to work," stop and suggest
running `policy-judge` instead — that's exactly the judgment call it exists to make,
and writing it into the repo anyway would be re-litigating a decision this project
already made once (see the "confirm before committing" case in this project's
history: it started as a draft policy and was correctly demoted to memory).

## Writing the three layers

1. **`.policy/<topic>.md`** — copy `templates/policy-template.md` and fill in the
   obligation IDs; don't freehand the structure. Each obligation gets its own
   `<PREFIX>-N` (one sentence, exactly one MUST/SHOULD/MUST NOT/MAY), followed by a
   shared "Rationale:" for the section it belongs to. Check existing `.policy/*.md`
   files for prefixes already taken before picking a new one — a prefix is assigned
   once and never reused, even if an obligation is later removed or the file is
   restructured, so anything that ever cited it by ID doesn't silently start pointing
   at something else. If the topic has more than one distinct rule area (like `git.md`
   covering commits, worktrees, new files, and auth), split it into sections the same
   way, each with its own obligations. Don't pad it with implementation detail that
   belongs in `CLAUDE.md` instead — mechanism (exact commands, exact tool calls) lives
   in the agent layer, not here.

2. **`CONTRIBUTING.md`** — add or extend a section under the relevant heading, written
   as instructions a human would actually follow, ending with a link back to the new
   policy file ("Full rationale: `.policy/<topic>.md`"). Don't duplicate the
   rationale paragraph here — the whole point of the split is one source of truth for
   *why*.

3. **`CLAUDE.md`** — same idea, phrased as agent-operational bullets. If the policy
   has a mechanism-specific detail that's genuinely agent-only (an exact tool
   invocation, a specific automation behavior), that's the right place for it, not
   the policy file.

4. **Check `constitution.md`.** If the rule is durable and non-negotiable enough that
   violating it would be a real regression — not just a process nicety — flag that it
   might belong as a constitution principle instead of (or in addition to) a regular
   policy, and ask before proceeding either way. This should be rare; most new
   policies are regular process rules, not constitutional principles.

## Finishing up

- If the new policy is replacing something that was sitting in memory (a
  not-yet-decided convention, an interim exception), say so and note that the memory
  entry should be retired once this is committed — per the graduation pipeline in
  `.policy/visibility.md`. Don't leave both existing at once.
- Show the user what you're about to write (or the diff, if extending an existing
  file) before committing — per `.policy/git.md`'s rule to ask before adding a
  new top-level/structural file. Extending an existing policy file with a new section
  is not "new top-level," so use judgment: a brand-new `.policy/<topic>.md` file
  is exactly the kind of thing that rule is about.
- Commit following `.policy/git.md` (one logical change — the whole
  three-layer addition is one change, not three) and `.policy/github.md` (every
  commit goes through a pull request).
