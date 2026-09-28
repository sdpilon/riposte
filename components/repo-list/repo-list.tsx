import {
  AlertOctagon,
  AlertTriangle,
  CircleOff,
  TrendingUp,
} from "lucide-react";

export interface RepoListItem {
  id: string;
  owner: string;
  name: string;
  inclusionState: "included" | "excluded";
  exclusionReason: "fork" | "archived" | "no_readme" | "no_activity" | null;
  completionEstimate: number | null;
  statusTier: "on_track" | "at_risk" | "stalled" | null;
  verdict: string | null;
}

const EXCLUSION_LABELS: Record<
  NonNullable<RepoListItem["exclusionReason"]>,
  string
> = {
  fork: "Excluded — this is a fork",
  archived: "Excluded — repository is archived",
  no_readme: "Excluded — no README found",
  no_activity: "Excluded — no commits, issues, or pull requests",
};

const STATUS_TIER_LABELS: Record<
  NonNullable<RepoListItem["statusTier"]>,
  string
> = {
  on_track: "On track",
  at_risk: "At risk",
  stalled: "Stalled",
};

function StatusTierIcon({
  tier,
}: {
  tier: NonNullable<RepoListItem["statusTier"]>;
}) {
  switch (tier) {
    case "on_track":
      return (
        <TrendingUp
          className="size-4 text-emerald-600 dark:text-emerald-400"
          aria-hidden
        />
      );
    case "at_risk":
      return (
        <AlertTriangle
          className="size-4 text-amber-600 dark:text-amber-400"
          aria-hidden
        />
      );
    case "stalled":
      return (
        <AlertOctagon
          className="size-4 text-red-600 dark:text-red-400"
          aria-hidden
        />
      );
  }
}

export function RepoList({ repos }: { repos: RepoListItem[] }) {
  if (repos.length === 0) {
    return (
      <p className="text-sm text-neutral-500 dark:text-neutral-400">
        No repos discovered yet — trigger a population run to get started.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
      {repos.map((repo) => (
        <li key={repo.id} className="py-4">
          <div className="flex items-center justify-between gap-4">
            <span className="font-medium">
              {repo.owner}/{repo.name}
            </span>

            {repo.inclusionState === "excluded" ? (
              <span className="flex items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-400">
                <CircleOff className="size-4" aria-hidden />
                {repo.exclusionReason
                  ? EXCLUSION_LABELS[repo.exclusionReason]
                  : "Excluded"}
              </span>
            ) : repo.statusTier ? (
              <span className="flex items-center gap-1.5 text-sm">
                <StatusTierIcon tier={repo.statusTier} />
                {STATUS_TIER_LABELS[repo.statusTier]}
                {repo.completionEstimate !== null
                  ? ` · ${repo.completionEstimate}%`
                  : null}
              </span>
            ) : (
              <span className="text-sm text-neutral-500 dark:text-neutral-400">
                Not yet assessed
              </span>
            )}
          </div>

          {repo.inclusionState === "included" && repo.verdict ? (
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
              {repo.verdict}
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
