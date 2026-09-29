import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { runs } from "@/lib/db/schema";
import { createRun, RunAlreadyInProgressError } from "@/lib/runs/runner";

/** FR-010/FR-011 — see contracts/runs-api.md. */
export async function POST() {
  try {
    const { runId } = await createRun();
    const [run] = await db
      .select({ reposTotal: runs.reposTotal })
      .from(runs)
      .where(eq(runs.id, runId))
      .limit(1);

    return NextResponse.json(
      { runId, status: "in_progress", reposTotal: run?.reposTotal ?? 0 },
      { status: 202 },
    );
  } catch (err) {
    if (err instanceof RunAlreadyInProgressError) {
      return NextResponse.json(
        { error: "run_in_progress", runId: err.existingRunId },
        { status: 409 },
      );
    }
    throw err;
  }
}
