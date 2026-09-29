import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  runs,
  runItems,
  trackedRepos,
  activityRecords,
  assessments,
} from "@/lib/db/schema";
import { discoverAccount } from "@/lib/repos/discovery";
import { needsReassessment } from "@/lib/assessment/change-detection";
import { generateAssessment } from "@/lib/assessment/provider";
import { GitHubClient } from "@/lib/github/client";

export class RunAlreadyInProgressError extends Error {
  constructor(public readonly existingRunId: string) {
    super("A population run is already in progress");
  }
}

function isUniqueViolation(err: unknown): boolean {
  // The neon-http driver wraps the underlying Postgres error (which carries
  // `code`) in an outer "Failed query" error via `.cause`, rather than
  // exposing `code` on the thrown error itself — walk the cause chain.
  let current: unknown = err;
  while (typeof current === "object" && current !== null) {
    if ("code" in current && (current as { code?: unknown }).code === "23505") {
      return true;
    }
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}

/**
 * FR-010/FR-011: create the run row and return immediately. The database's
 * partial unique index (`runs_single_in_progress`, data-model.md) is what
 * actually enforces "only one run at a time" — this function just turns
 * that constraint violation into a typed error for the API route to map to
 * a 409.
 */
export async function createRun(): Promise<{ runId: string }> {
  try {
    const [row] = await db
      .insert(runs)
      .values({ status: "in_progress", reposTotal: 0 })
      .returning({ id: runs.id });
    return { runId: row.id };
  } catch (err) {
    if (isUniqueViolation(err)) {
      const [existing] = await db
        .select({ id: runs.id })
        .from(runs)
        .where(eq(runs.status, "in_progress"))
        .limit(1);
      throw new RunAlreadyInProgressError(existing?.id ?? "unknown");
    }
    throw err;
  }
}

const MAX_ADVANCE_DURATION_MS = 8_000;
const BATCH_SIZE = 25;

/**
 * Advances an in-progress run by up to MAX_ADVANCE_DURATION_MS of work,
 * then returns — the resumable, chunked design from research.md, meant to
 * be called repeatedly (e.g. by a Vercel Cron tick) until the run
 * completes. Safe to call again on a run that's already finished (no-op).
 *
 * KNOWN LIMITATION: discovery (the first tick) enumerates every repo in
 * one pass rather than being itself chunked/resumable. If it's interrupted
 * partway (e.g. by a GitHub rate limit), already-discovered repos are
 * safely upserted (idempotent), but a retry re-lists from the start rather
 * than resuming past the point of failure. Acceptable at the ~100-repo
 * scale this feature targets (NFR-002); revisit if discovery itself needs
 * to be chunked at a larger scale.
 */
export async function advanceRun(
  runId: string,
  client: GitHubClient = new GitHubClient(),
): Promise<void> {
  const [run] = await db.select().from(runs).where(eq(runs.id, runId)).limit(1);
  if (!run || run.status !== "in_progress") return;

  const deadline = Date.now() + MAX_ADVANCE_DURATION_MS;

  const [{ value: existingItemCount }] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(runItems)
    .where(eq(runItems.runId, runId));

  if (existingItemCount === 0) {
    try {
      const discovered = await discoverAccount(client);
      const includedRepoIds = discovered
        .filter((d) => d.inclusionState === "included")
        .map((d) => d.repoId);

      if (includedRepoIds.length > 0) {
        await db
          .insert(runItems)
          .values(includedRepoIds.map((repoId) => ({ runId, repoId })));
      }
      await db
        .update(runs)
        .set({ reposTotal: includedRepoIds.length })
        .where(eq(runs.id, runId));
    } catch (err) {
      await db
        .update(runs)
        .set({ status: "failed", finishedAt: new Date() })
        .where(eq(runs.id, runId));
      throw err;
    }
  }

  while (Date.now() < deadline) {
    const batch = await db
      .select({ item: runItems, repo: trackedRepos })
      .from(runItems)
      .innerJoin(trackedRepos, eq(runItems.repoId, trackedRepos.id))
      .where(and(eq(runItems.runId, runId), eq(runItems.outcome, "pending")))
      .limit(BATCH_SIZE);

    if (batch.length === 0) break;

    for (const { item, repo } of batch) {
      if (Date.now() >= deadline) break;
      await processRunItem(item, repo, client);
    }
  }

  const [{ value: remaining }] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(runItems)
    .where(and(eq(runItems.runId, runId), eq(runItems.outcome, "pending")));

  if (remaining === 0) {
    const [{ value: failedCount }] = await db
      .select({ value: sql<number>`count(*)::int` })
      .from(runItems)
      .where(and(eq(runItems.runId, runId), eq(runItems.outcome, "failed")));

    await db
      .update(runs)
      .set({
        status: failedCount > 0 ? "partial" : "completed",
        finishedAt: new Date(),
      })
      .where(eq(runs.id, runId));
  }
}

async function processRunItem(
  item: typeof runItems.$inferSelect,
  repo: typeof trackedRepos.$inferSelect,
  client: GitHubClient,
): Promise<void> {
  try {
    const readme = repo.hasReadme
      ? await client.getReadme(repo.owner, repo.name)
      : null;
    const { needed, fingerprint } = await needsReassessment(repo.id, readme);

    if (!needed) {
      await markItem(item.id, "skipped_unchanged");
      await bumpRunCounters(item.runId, { failed: false });
      return;
    }

    const activityRows = await db
      .select()
      .from(activityRecords)
      .where(eq(activityRecords.repoId, repo.id));

    const result = await generateAssessment({
      repoOwner: repo.owner,
      repoName: repo.name,
      readme,
      activity: activityRows.map((a) => ({
        kind: a.kind,
        externalId: a.externalId,
        occurredAt: a.occurredAt.toISOString(),
        summary: a.summary,
      })),
    });

    const evidenceIds = result.evidence
      .map(
        (ev) =>
          activityRows.find(
            (a) => a.kind === ev.kind && a.externalId === ev.externalId,
          )?.id,
      )
      .filter((id): id is string => Boolean(id));

    if (evidenceIds.length === 0) {
      throw new Error(
        "Assessment rejected: cited evidence didn't match any known activity record (FR-005).",
      );
    }

    await db.insert(assessments).values({
      repoId: repo.id,
      completionEstimate: result.completionEstimate.toFixed(2),
      statusTier: result.statusTier,
      verdict: result.verdict,
      evidenceRefs: evidenceIds,
      inputsFingerprint: fingerprint,
    });

    await markItem(item.id, "succeeded");
    await bumpRunCounters(item.runId, { failed: false });
  } catch (err) {
    await markItem(
      item.id,
      "failed",
      err instanceof Error ? err.message : String(err),
    );
    await bumpRunCounters(item.runId, { failed: true });
  }
}

async function markItem(
  itemId: string,
  outcome: "succeeded" | "failed" | "skipped_unchanged",
  errorMessage?: string,
): Promise<void> {
  await db
    .update(runItems)
    .set({
      outcome,
      processedAt: new Date(),
      errorMessage: errorMessage ?? null,
    })
    .where(eq(runItems.id, itemId));
}

async function bumpRunCounters(
  runId: string,
  { failed }: { failed: boolean },
): Promise<void> {
  await db
    .update(runs)
    .set({
      reposProcessed: sql`${runs.reposProcessed} + 1`,
      reposFailed: failed ? sql`${runs.reposFailed} + 1` : runs.reposFailed,
    })
    .where(eq(runs.id, runId));
}
