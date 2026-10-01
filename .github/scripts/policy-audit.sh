#!/usr/bin/env bash
# Implements the checks described in .claude/skills/policy-audit/SKILL.md, for the
# CA-1..CA-6 and CA-8 obligations in .policy/compliance-audit.md (CA-7 is the audit's
# own scope-exclusion rule, not a checkable repo-content claim). If that policy's
# obligations change, update this script in the same change -- this is the actual
# implementation; the skill documents the contract.
set -uo pipefail

check() {
  local id="$1" desc="$2"
  shift 2
  if "$@"; then
    echo "PASS $id: $desc"
  else
    echo "FAIL $id: $desc"
    file_issue "$id" "$desc"
  fi
}

file_issue() {
  local id="$1" desc="$2"
  local existing
  existing="$(gh issue list --label process-hygiene --state open --search "$id" --json number --jq '.[0].number' 2>/dev/null)"
  if [ -n "${existing:-}" ] && [ "$existing" != "null" ]; then
    echo "  already tracked as #$existing"
    return
  fi
  gh issue create --label process-hygiene --title "$id: $desc" \
    --body "Detected unmet by the compliance-audit CI check on $(date -u +%Y-%m-%d). See .policy/compliance-audit.md for the full obligation. This check verifies existence/pattern only, not sufficiency." \
    >/dev/null 2>&1 && echo "  filed new issue" || echo "  could not file issue (insufficient permissions?)"
}

ca1() { [ -f .changeset/config.json ] || [ -f release.config.js ] || [ -f release.config.cjs ] || [ -f release.config.mjs ]; }
ca2() { [ -f Dockerfile ] || [ -f docker-compose.yml ] || [ -f docker-compose.yaml ] || [ -f compose.yml ]; }
ca8() { [ -f SELF_HOSTING.md ] || [ -f docs/self-hosting.md ] || grep -rliq "self.?host" -- *.md 2>/dev/null; }
ca3() { grep -rlqiE "sanitiz|prompt.?inject" lib/assessment lib/github 2>/dev/null; }
ca4() { grep -rlqi "demo" app lib 2>/dev/null; }
ca5() { ! grep -rEq "sdpilon|spencerpilon" lib app components 2>/dev/null; }
# Note: CA-6 only checks that these files are never accidentally tracked --
# whether they exist at all is a fact about a contributor's local machine, which a
# fresh CI checkout can never observe (gitignored files aren't cloned). Checking
# for their presence here would always fail in CI regardless of real compliance.
ca6() {
  ! git ls-files --error-unmatch CLAUDE.local.md >/dev/null 2>&1 &&
  ! git ls-files --error-unmatch .claude/settings.local.json >/dev/null 2>&1
}

check CA-1 "release/versioning automation tooling present" ca1
check CA-2 "self-host packaging present" ca2
check CA-3 "sanitization/prompt-injection handling near README-fetch path" ca3
check CA-4 "credential-free demo/fake-data path exists" ca4
check CA-5 "no hardcoded personal-identity strings in application source" ca5
check CA-6 "committed-vs-personal boundary holds" ca6
check CA-8 "self-host documentation present" ca8

exit 0
