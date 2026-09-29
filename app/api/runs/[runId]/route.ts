import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { runs } from "@/lib/db/schema";

/** FR-010's incremental visibility — see contracts/runs-api.md. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ runId: string }> },
) {
  const { runId } = await params;
  const [run] = await db.select().from(runs).where(eq(runs.id, runId)).limit(1);

  if (!run) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({
    runId: run.id,
    status: run.status,
    startedAt: run.startedAt.toISOString(),
    finishedAt: run.finishedAt ? run.finishedAt.toISOString() : null,
    reposTotal: run.reposTotal,
    reposProcessed: run.reposProcessed,
    reposFailed: run.reposFailed,
  });
}
