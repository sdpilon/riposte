import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { runs } from "@/lib/db/schema";
import { advanceRun } from "@/lib/runs/runner";

/**
 * Invoked by Vercel Cron (see vercel.json) to advance whichever run is
 * currently in progress, one bounded chunk at a time (research.md's
 * chunked-cron design). A GET with nothing to do is a normal, cheap no-op —
 * Cron fires on a fixed schedule whether or not a run happens to be active.
 */
export async function GET() {
  const [inProgress] = await db
    .select({ id: runs.id })
    .from(runs)
    .where(eq(runs.status, "in_progress"))
    .limit(1);

  if (!inProgress) {
    return NextResponse.json({ advanced: false });
  }

  await advanceRun(inProgress.id);
  return NextResponse.json({ advanced: true, runId: inProgress.id });
}
