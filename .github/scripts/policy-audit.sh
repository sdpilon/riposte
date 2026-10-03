#!/usr/bin/env bash
# Implements the self-verifiable checks for rules 003-008 and 010 in .policy/rule/
# (rule 009 is the audit's own scope-exclusion rule, not a checkable repo-content
# claim). If any of those rules change, update this script in the same change.
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
    --body "Detected unmet by the compliance-audit CI check on $(date -u +%Y-%m-%d). See .policy/rule/ for the full rule. This check verifies existence/pattern only, not sufficiency." \
    >/dev/null 2>&1 && echo "  filed new issue" || echo "  could not file issue (insufficient permissions?)"
}

ca1() { [ -f .changeset/config.json ] || [ -f release.config.js ] || [ -f release.config.cjs ] || [ -f release.config.mjs ]; }
ca2() { [ -f Dockerfile ] || [ -f docker-compose.yml ] || [ -f docker-compose.yaml ] || [ -f compose.yml ]; }
ca8() { [ -f SELF_HOSTING.md ] || [ -f docs/self-hosting.md ] || grep -rliq "self.?host" -- *.md 2>/dev/null; }
ca3() { grep -rlqiE "sanitiz|prompt.?inject" lib/assessment lib/github 2>/dev/null; }
ca4() { grep -rlqi "demo" app lib 2>/dev/null; }
ca5() { ! grep -rEq "sdpilon|spencerpilon" lib app components 2>/dev/null; }
# Note: 008 only checks that these files are never accidentally tracked --
# whether they exist at all is a fact about a contributor's local machine, which a
# fresh CI checkout can never observe (gitignored files aren't cloned). Checking
# for their presence here would always fail in CI regardless of real compliance.
ca6() {
  ! git ls-files --error-unmatch CLAUDE.local.md >/dev/null 2>&1 &&
  ! git ls-files --error-unmatch .claude/settings.local.json >/dev/null 2>&1
}

check 003 "release/versioning automation tooling present" ca1
check 004 "self-host packaging present" ca2
check 005 "sanitization/prompt-injection handling near README-fetch path" ca3
check 006 "credential-free demo/fake-data path exists" ca4
check 007 "no hardcoded personal-identity strings in application source" ca5
check 008 "committed-vs-personal boundary holds" ca6
check 010 "self-host documentation present" ca8

exit 0
