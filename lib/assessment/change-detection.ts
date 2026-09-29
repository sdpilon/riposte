import { createHash } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { activityRecords, assessments } from "@/lib/db/schema";

export interface FingerprintableActivity {
  kind: string;
  externalId: string;
  occurredAt: Date;
  summary: string;
}

/**
 * FR-006: any new commit, issue, or pull request event since the last
 * assessment counts as a change — no accumulation threshold (spec.md's
 * Clarifications, 2026-09-27). Sorting before hashing makes the result
 * independent of fetch/DB row order, so re-running against unchanged data
 * always produces the same fingerprint.
 */
export function computeFingerprint(
  readme: string | null,
  activity: FingerprintableActivity[],
): string {
  const lines = activity
    .map(
      (item) =>
        `${item.kind}:${item.externalId}:${item.occurredAt.toISOString()}:${item.summary}`,
    )
    .sort();

  const hash = createHash("sha256");
  hash.update(readme ?? "");
  hash.update("\n---\n");
  hash.update(lines.join("\n"));
  return hash.digest("hex");
}

export interface ReassessmentCheck {
  needed: boolean;
  fingerprint: string;
}

/** Compares against the repo's current (most recent) assessment, if any. */
export async function needsReassessment(
  repoId: string,
  readme: string | null,
): Promise<ReassessmentCheck> {
  const activity = await db
    .select({
      kind: activityRecords.kind,
      externalId: activityRecords.externalId,
      occurredAt: activityRecords.occurredAt,
      summary: activityRecords.summary,
    })
    .from(activityRecords)
    .where(eq(activityRecords.repoId, repoId));

  const fingerprint = computeFingerprint(readme, activity);

  const [latest] = await db
    .select({ inputsFingerprint: assessments.inputsFingerprint })
    .from(assessments)
    .where(eq(assessments.repoId, repoId))
    .orderBy(desc(assessments.createdAt))
    .limit(1);

  return {
    needed: !latest || latest.inputsFingerprint !== fingerprint,
    fingerprint,
  };
}
