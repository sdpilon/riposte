import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { RepoList, type RepoListItem } from "@/components/repo-list/repo-list";
import { RunTriggerButton } from "@/components/repo-list/run-trigger-button";

// This page's content depends on live, frequently-changing DB state (a
// population run can be in progress at any time) — never a candidate for
// static generation/ISR.
export const dynamic = "force-dynamic";

interface RepoListingRow {
  [key: string]: unknown;
  id: string;
  owner: string;
  name: string;
  inclusion_state: "included" | "excluded";
  exclusion_reason: "fork" | "archived" | "no_readme" | "no_activity" | null;
  completion_estimate: string | null;
  status_tier: "on_track" | "at_risk" | "stalled" | null;
  verdict: string | null;
}

/**
 * Reads current state directly from tracked_repos/assessments — the
 * dashboard is not a consumer of the runs API (contracts/runs-api.md's
 * "Out of scope for this contract"). The DISTINCT-ON-equivalent lateral
 * join picks each repo's current (latest) assessment in the query itself,
 * not by pulling every historical assessment into application code
 * (engineering-practices.md's "latest per key" lesson).
 */
async function getRepoListing(): Promise<RepoListItem[]> {
  const result = await db.execute<RepoListingRow>(sql`
    SELECT
      tr.id,
      tr.owner,
      tr.name,
      tr.inclusion_state,
      tr.exclusion_reason,
      a.completion_estimate,
      a.status_tier,
      a.verdict
    FROM tracked_repos tr
    LEFT JOIN LATERAL (
      SELECT completion_estimate, status_tier, verdict
      FROM assessments
      WHERE assessments.repo_id = tr.id
      ORDER BY created_at DESC
      LIMIT 1
    ) a ON true
    ORDER BY tr.owner, tr.name
  `);

  return result.rows.map((row) => ({
    id: row.id,
    owner: row.owner,
    name: row.name,
    inclusionState: row.inclusion_state,
    exclusionReason: row.exclusion_reason,
    completionEstimate:
      row.completion_estimate !== null ? Number(row.completion_estimate) : null,
    statusTier: row.status_tier,
    verdict: row.verdict,
  }));
}

export default async function DashboardPage() {
  const repos = await getRepoListing();

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Riposte</h1>
        <RunTriggerButton />
      </div>
      <RepoList repos={repos} />
    </main>
  );
}
