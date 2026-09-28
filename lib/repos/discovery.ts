import { db } from "@/lib/db/client";
import { trackedRepos, activityRecords } from "@/lib/db/schema";
import { GitHubClient } from "@/lib/github/client";
import { classifyRepo, type InclusionState } from "./classify";

export interface DiscoveredRepo {
  repoId: string;
  inclusionState: InclusionState;
}

/**
 * FR-001: discover every repo in the connected account. FR-002/FR-003:
 * classify each one (fork/archived/no-README/no-activity) and persist the
 * specific reason. FR-009: works identically for public and private repos
 * — GitHubClient.listRepos already asks for both.
 */
export async function discoverAccount(
  client: GitHubClient = new GitHubClient(),
): Promise<DiscoveredRepo[]> {
  const repos = await client.listRepos();
  const results: DiscoveredRepo[] = [];

  for (const repo of repos) {
    const [readme, commits, issues, pullRequests] = await Promise.all([
      client.getReadme(repo.owner, repo.name),
      client.listCommits(repo.owner, repo.name),
      client.listIssues(repo.owner, repo.name),
      client.listPullRequests(repo.owner, repo.name),
    ]);

    const hasReadme = readme !== null;
    const hasAnyActivity =
      commits.length > 0 || issues.length > 0 || pullRequests.length > 0;

    const classification = classifyRepo({
      isFork: repo.isFork,
      isArchived: repo.isArchived,
      hasReadme,
      hasAnyActivity,
    });

    const occurredTimestamps = [...commits, ...issues, ...pullRequests].map(
      (item) => new Date(item.occurredAt).getTime(),
    );
    const lastActivityAt =
      occurredTimestamps.length > 0
        ? new Date(Math.max(...occurredTimestamps))
        : null;

    const now = new Date();
    await db
      .insert(trackedRepos)
      .values({
        id: repo.id,
        owner: repo.owner,
        name: repo.name,
        isFork: repo.isFork,
        isArchived: repo.isArchived,
        hasReadme,
        inclusionState: classification.inclusionState,
        exclusionReason: classification.exclusionReason,
        lastActivityAt,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: trackedRepos.id,
        set: {
          owner: repo.owner,
          name: repo.name,
          isFork: repo.isFork,
          isArchived: repo.isArchived,
          hasReadme,
          inclusionState: classification.inclusionState,
          exclusionReason: classification.exclusionReason,
          lastActivityAt,
          updatedAt: now,
        },
      });

    // Only included repos need stored evidence — an excluded repo is never
    // assessed, so there's nothing for activity_records to back.
    if (classification.inclusionState === "included") {
      const rows = [
        ...commits.map((c) => ({
          repoId: repo.id,
          kind: "commit" as const,
          externalId: c.externalId,
          occurredAt: new Date(c.occurredAt),
          summary: c.summary,
        })),
        ...issues.map((i) => ({
          repoId: repo.id,
          kind: "issue" as const,
          externalId: i.externalId,
          occurredAt: new Date(i.occurredAt),
          summary: i.summary,
        })),
        ...pullRequests.map((p) => ({
          repoId: repo.id,
          kind: "pull_request" as const,
          externalId: p.externalId,
          occurredAt: new Date(p.occurredAt),
          summary: p.summary,
        })),
      ];

      if (rows.length > 0) {
        await db
          .insert(activityRecords)
          .values(rows)
          .onConflictDoNothing({
            target: [
              activityRecords.repoId,
              activityRecords.kind,
              activityRecords.externalId,
            ],
          });
      }
    }

    results.push({
      repoId: repo.id,
      inclusionState: classification.inclusionState,
    });
  }

  return results;
}
