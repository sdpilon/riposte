---
name: policy-judge
description: Decide whether a proposed rule for this repo — "we should always/never do X", a new convention, a house rule — belongs in the committed policy layer (docs/policies/, CONTRIBUTING.md, CLAUDE.md) or is actually personal/agent-collaboration preference that belongs in memory or CLAUDE.local.md instead. Use this whenever it's genuinely unclear which bucket a new rule belongs in, including when you (Claude) are about to write a new procedural instruction into a repo file and aren't sure it's really a repo-wide policy rather than just how this person likes to work. Hands off to policy-add once something is judged to be a real policy.
---

# Judging policy vs. preference

Not every rule someone wants followed belongs in this repo. `docs/policies/visibility.md`
draws the line: a committed file is for anything a stranger picking up this repo cold
— a future contributor, a different agent — would need or benefit from. Something
that's really about how one specific person wants to collaborate with an agent
doesn't meet that bar, no matter how firmly held or how often it comes up, and putting
it in a repo file anyway just adds noise for every other reader.

This is a real judgment call, not a keyword match, and it's been gotten wrong before
in this project's own history: "confirm the user is happy with a change before
committing it" was first drafted straight into `docs/policies/git.md`, `CLAUDE.md`,
and `CONTRIBUTING.md` — then, on reflection, recognized as being about how one person
wants to review agent work, not a property of this repo, and moved to memory instead.
That's the case to have in mind when something feels ambiguous.

## The actual test

Ask two questions, in order:

1. **Would this rule make sense stated about anyone or anything acting in this repo**
   — not just the current person, not just Claude specifically — **or does it only
   make sense as a statement about how one particular person likes to work?**
   "Automation should never merge, regardless of CI status" passes: it's a claim
   about where human judgment has to sit in this repo's process, true for any
   automation. "Confirm with me before committing" fails at face value — but see the
   next check before concluding that.

2. **Does an existing policy already have the same shape?** Look for a structural
   twin. `docs/policies/github.md` already says "never open a PR unasked just because
   a branch was pushed — separate authorizations." If the proposed rule is really
   "action A doesn't imply authorization for action B" in different clothes, it's
   policy-shaped even if the first framing sounded like preference — reframe it to
   match the existing pattern rather than discarding it. If instead the rule would
   need to flex depending on mood, context, or trust level rather than being a fixed
   authorization boundary, that's the tell that it's preference, not policy.

If it passes both checks: policy. If it fails: memory (or `CLAUDE.local.md` — see
below for which).

## Don't let a hedge slide past unaddressed

A request phrased with a hedge — "for now," "I think," "maybe," "let's try" — doesn't
settle the verdict by itself, but it does need its own explicit pass; running the two
questions above and never mentioning the hedge is a gap, not a shortcut. A hedge can
mean either of two different things:

- The rule really is temporary or exploratory — leans toward "not yet decided" rather
  than a settled policy, which points toward memory (or simply not placing it anywhere
  yet and asking whether it's a real decision).
- The rule itself is durable and repo-wide, and the hedge is just how the person
  phrased it in the moment — doesn't change the verdict, but say so explicitly rather
  than reasoning as if the hedge weren't there.

Name the hedge in your reasoning and state which of the two it is and why, the same
way you'd name a structural twin or the lack of one. A verdict that never
acknowledges a hedge sitting right in the request reads as having missed it, even if
the verdict itself turns out right.

## Placing the verdict

**Judged as policy** → hand off to `policy-add` to actually create/extend the
relevant `docs/policies/<topic>.md`, `CONTRIBUTING.md`, and `CLAUDE.md` sections. Don't
duplicate that process here.

**Judged as not policy** → it splits further, by durability and relevance, same as
`docs/policies/visibility.md` describes:

- **Agent-collaboration style** (how closely to review work, communication
  preferences, risk tolerance) → a memory file in this project's memory directory,
  type `feedback`. Use the existing format: frontmatter with `name`, `description`,
  `metadata.type: feedback`, then a body with the rule, a **Why:** line explaining
  the reasoning (including, if relevant, why it looked like policy at first), and a
  **How to apply:** line. Add a one-line pointer to `MEMORY.md`.
- **Personal/environment-specific but genuinely durable and project-relevant** (a
  local path, a tool preference tied to working on *this* repo specifically) →
  `CLAUDE.local.md` instead — it's gitignored, so it's fine there even though it's
  not memory.

Either way, say the verdict and the reasoning out loud before placing it — per how
this judgment call has been made in this project so far, the person asking should be
able to see and override the reasoning, not just receive a silent placement.
