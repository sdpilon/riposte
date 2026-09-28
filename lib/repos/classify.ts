export type InclusionState = "included" | "excluded";
export type ExclusionReason = "fork" | "archived" | "no_readme" | "no_activity";

export interface ClassificationInput {
  isFork: boolean;
  isArchived: boolean;
  hasReadme: boolean;
  /** True if the repo has at least one commit, issue, or pull request ever
   * — not a recent-activity window (spec.md's Assumptions: a repo with
   * real historical activity that's since gone quiet is "stalled", not
   * excluded). */
  hasAnyActivity: boolean;
}

export interface ClassificationResult {
  inclusionState: InclusionState;
  exclusionReason: ExclusionReason | null;
}

/**
 * FR-002: auto-exclude a fork, an archived repo, a repo with no README, or
 * a repo with no activity at all; everything else is included by default.
 * FR-003 (making the reason visible) is handled by whoever reads this
 * result, not here — see components/repo-list/.
 */
export function classifyRepo(input: ClassificationInput): ClassificationResult {
  if (input.isFork) {
    return { inclusionState: "excluded", exclusionReason: "fork" };
  }
  if (input.isArchived) {
    return { inclusionState: "excluded", exclusionReason: "archived" };
  }
  if (!input.hasReadme) {
    return { inclusionState: "excluded", exclusionReason: "no_readme" };
  }
  if (!input.hasAnyActivity) {
    return { inclusionState: "excluded", exclusionReason: "no_activity" };
  }
  return { inclusionState: "included", exclusionReason: null };
}
