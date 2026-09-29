import { Octokit } from "@octokit/rest";
import { throttling } from "@octokit/plugin-throttling";
import { retry } from "@octokit/plugin-retry";
import { getGitHubToken } from "@/lib/config/env";

/**
 * Read-only wrapper around Octokit (Constitution Principle III,
 * NON-NEGOTIABLE: this tool observes GitHub, it never writes back). Every
 * method here maps to a read endpoint — there is no method that could
 * mutate a repo, issue, or PR, which is what makes "this code cannot write
 * to GitHub" auditable by inspection rather than by convention.
 */

const ThrottledOctokit = Octokit.plugin(throttling, retry);

export interface RepoSummary {
  id: string;
  owner: string;
  name: string;
  isFork: boolean;
  isArchived: boolean;
}

export interface ActivityItem {
  externalId: string;
  occurredAt: string;
  summary: string;
}

export class GitHubClient {
  private readonly octokit: InstanceType<typeof ThrottledOctokit>;

  constructor(token: string = getGitHubToken()) {
    this.octokit = new ThrottledOctokit({
      auth: token,
      throttle: {
        onRateLimit: (
          _retryAfter: number,
          options: { method: string; url: string },
          octokit: { log: { warn: (message: string) => void } },
          retryCount: number,
        ) => {
          octokit.log.warn(
            `Rate limit hit for ${options.method} ${options.url}`,
          );
          // Retry once, then give up — the caller (lib/runs/runner.ts)
          // catches the resulting error and records the run as "partial"
          // rather than crashing the whole run (spec.md's Edge Cases).
          return retryCount < 1;
        },
        onSecondaryRateLimit: (
          _retryAfter: number,
          options: { method: string; url: string },
          octokit: { log: { warn: (message: string) => void } },
        ) => {
          octokit.log.warn(
            `Secondary rate limit hit for ${options.method} ${options.url}`,
          );
          return true;
        },
      },
    });
  }

  /** Every repo owned by the token's account — public and private alike (FR-009). */
  async listRepos(): Promise<RepoSummary[]> {
    const repos = await this.octokit.paginate(
      this.octokit.rest.repos.listForAuthenticatedUser,
      { visibility: "all", affiliation: "owner", per_page: 100 },
    );
    return repos.map((r) => ({
      id: String(r.id),
      owner: r.owner.login,
      name: r.name,
      isFork: r.fork,
      isArchived: r.archived ?? false,
    }));
  }

  /** Returns null if the repo genuinely has no README, not just on any error. */
  async getReadme(owner: string, repo: string): Promise<string | null> {
    try {
      const res = await this.octokit.rest.repos.getReadme({ owner, repo });
      return Buffer.from(res.data.content, "base64").toString("utf-8");
    } catch (err) {
      if (isNotFound(err)) return null;
      throw err;
    }
  }

  async listCommits(
    owner: string,
    repo: string,
    since?: string,
  ): Promise<ActivityItem[]> {
    try {
      const commits = await this.octokit.paginate(
        this.octokit.rest.repos.listCommits,
        { owner, repo, since, per_page: 100 },
      );
      return commits.map((c) => ({
        externalId: c.sha,
        occurredAt:
          c.commit.author?.date ??
          c.commit.committer?.date ??
          new Date().toISOString(),
        summary: c.commit.message.split("\n")[0],
      }));
    } catch (err) {
      // An empty repo (no commits at all) 409s on this endpoint.
      if (isConflict(err)) return [];
      throw err;
    }
  }

  /** Issues only — pull requests come back from listPullRequests instead,
   * even though GitHub's Issues API technically returns both. */
  async listIssues(
    owner: string,
    repo: string,
    since?: string,
  ): Promise<ActivityItem[]> {
    const issues = await this.octokit.paginate(
      this.octokit.rest.issues.listForRepo,
      { owner, repo, state: "all", since, per_page: 100 },
    );
    return issues
      .filter((issue) => !("pull_request" in issue && issue.pull_request))
      .map((issue) => ({
        externalId: String(issue.number),
        occurredAt: issue.updated_at,
        summary: issue.title,
      }));
  }

  /** A repo with the Pull Requests feature disabled 404s this endpoint —
   * that's "no PR activity", not a failure, so it returns []. */
  async listPullRequests(owner: string, repo: string): Promise<ActivityItem[]> {
    try {
      const prs = await this.octokit.paginate(this.octokit.rest.pulls.list, {
        owner,
        repo,
        state: "all",
        per_page: 100,
      });
      return prs.map((pr) => ({
        externalId: String(pr.number),
        occurredAt: pr.updated_at,
        summary: pr.title,
      }));
    } catch (err) {
      if (isNotFound(err)) return [];
      throw err;
    }
  }
}

function isNotFound(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "status" in err &&
    err.status === 404
  );
}

function isConflict(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "status" in err &&
    err.status === 409
  );
}
