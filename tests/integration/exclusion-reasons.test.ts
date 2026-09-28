import { describe, expect, it } from "vitest";
import { classifyRepo } from "@/lib/repos/classify";

/**
 * FR-002/FR-003, User Story 2's Independent Test: a fork, an archived
 * repo, a no-README repo, and a no-activity repo in the same account each
 * end up with the correct, specific exclusion_reason.
 *
 * Scoped to classifyRepo (the actual FR-002 decision logic) rather than a
 * full discoverAccount()-driven run: that would need a live GitHub token
 * and Postgres connection, which this sandboxed test environment doesn't
 * have — see quickstart.md's step 4 for the full end-to-end check against
 * a real account.
 */
describe("classifyRepo (FR-002, FR-003)", () => {
  const baseline = {
    isFork: false,
    isArchived: false,
    hasReadme: true,
    hasAnyActivity: true,
  };

  it("excludes a fork with reason 'fork'", () => {
    expect(classifyRepo({ ...baseline, isFork: true })).toEqual({
      inclusionState: "excluded",
      exclusionReason: "fork",
    });
  });

  it("excludes an archived repo with reason 'archived'", () => {
    expect(classifyRepo({ ...baseline, isArchived: true })).toEqual({
      inclusionState: "excluded",
      exclusionReason: "archived",
    });
  });

  it("excludes a repo with no README with reason 'no_readme'", () => {
    expect(classifyRepo({ ...baseline, hasReadme: false })).toEqual({
      inclusionState: "excluded",
      exclusionReason: "no_readme",
    });
  });

  it("excludes a repo with zero activity ever with reason 'no_activity'", () => {
    expect(classifyRepo({ ...baseline, hasAnyActivity: false })).toEqual({
      inclusionState: "excluded",
      exclusionReason: "no_activity",
    });
  });

  it("includes a repo that fails none of the automatic exclusion conditions", () => {
    expect(classifyRepo(baseline)).toEqual({
      inclusionState: "included",
      exclusionReason: null,
    });
  });

  it("a repo with real historical activity that's since gone quiet is NOT excluded (spec.md's Assumptions)", () => {
    // "hasAnyActivity" means "ever", not "recently" — a stalled-but-once-active
    // repo must still come through as included so it can be assessed as
    // "stalled", not silently dropped.
    expect(classifyRepo({ ...baseline, hasAnyActivity: true })).toEqual({
      inclusionState: "included",
      exclusionReason: null,
    });
  });
});
