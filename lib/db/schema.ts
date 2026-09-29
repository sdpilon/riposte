import { sql } from "drizzle-orm";
import {
  pgTable,
  pgEnum,
  text,
  boolean,
  timestamp,
  integer,
  numeric,
  uuid,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// See specs/001-account-progress-sweep/data-model.md for the full field
// rationale — this file is the concrete Drizzle rendering of that document.

export const inclusionStateEnum = pgEnum("inclusion_state", [
  "included",
  "excluded",
]);

export const exclusionReasonEnum = pgEnum("exclusion_reason", [
  "fork",
  "archived",
  "no_readme",
  "no_activity",
]);

export const activityKindEnum = pgEnum("activity_kind", [
  "commit",
  "issue",
  "pull_request",
]);

export const statusTierEnum = pgEnum("status_tier", [
  "on_track",
  "at_risk",
  "stalled",
]);

export const runStatusEnum = pgEnum("run_status", [
  "in_progress",
  "completed",
  "failed",
  "partial",
]);

export const runItemOutcomeEnum = pgEnum("run_item_outcome", [
  "pending",
  "succeeded",
  "failed",
  "skipped_unchanged",
]);

export const trackedRepos = pgTable("tracked_repos", {
  // GitHub's own repo id — stable identity, unlike owner/name which can
  // change on rename (data-model.md).
  id: text("id").primaryKey(),
  owner: text("owner").notNull(),
  name: text("name").notNull(),
  isFork: boolean("is_fork").notNull(),
  isArchived: boolean("is_archived").notNull(),
  hasReadme: boolean("has_readme").notNull(),
  inclusionState: inclusionStateEnum("inclusion_state").notNull(),
  // Required (non-null) whenever inclusionState = 'excluded' — enforced in
  // lib/repos/classify.ts, not at the schema level (Postgres CHECK
  // constraints spanning two columns are possible but add complexity this
  // feature's scope doesn't need yet).
  exclusionReason: exclusionReasonEnum("exclusion_reason"),
  lastActivityAt: timestamp("last_activity_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const activityRecords = pgTable(
  "activity_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    repoId: text("repo_id")
      .notNull()
      .references(() => trackedRepos.id),
    kind: activityKindEnum("kind").notNull(),
    // GitHub's id/SHA for this item — used for de-duplication on repeated
    // fetches (data-model.md's uniqueness rule).
    externalId: text("external_id").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    summary: text("summary").notNull(),
    fetchedAt: timestamp("fetched_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("activity_records_repo_kind_external_id").on(
      table.repoId,
      table.kind,
      table.externalId,
    ),
  ],
);

export const assessments = pgTable("assessments", {
  id: uuid("id").primaryKey().defaultRandom(),
  repoId: text("repo_id")
    .notNull()
    .references(() => trackedRepos.id),
  // Never updated after insert — this *is* the ordering key for "current
  // assessment" (FR-007). No updatedAt column on purpose: this row is
  // immutable.
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  completionEstimate: numeric("completion_estimate", {
    precision: 5,
    scale: 2,
  }).notNull(),
  statusTier: statusTierEnum("status_tier").notNull(),
  verdict: text("verdict").notNull(),
  // What the verdict actually cites (FR-005) — an assessment with an empty
  // array is rejected before insert by lib/assessment/provider.ts, not
  // stored invalid.
  evidenceRefs: uuid("evidence_refs").array().notNull(),
  // Hash of (README + relevant activity_records) as of generation; compared
  // on the next run to decide whether inputs have changed (FR-006).
  inputsFingerprint: text("inputs_fingerprint").notNull(),
});

export const runs = pgTable(
  "runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    status: runStatusEnum("status").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    reposTotal: integer("repos_total").notNull(),
    reposProcessed: integer("repos_processed").notNull().default(0),
    reposFailed: integer("repos_failed").notNull().default(0),
  },
  (table) => [
    // Enforces FR-011 (reject a trigger while one's already running) at the
    // database level — a real race-proof gate, not an app-level
    // check-then-insert (research.md, "Enforcing 'only one run at a time'").
    uniqueIndex("runs_single_in_progress")
      .on(table.status)
      .where(sql`${table.status} = 'in_progress'`),
  ],
);

export const runItems = pgTable(
  "run_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    runId: uuid("run_id")
      .notNull()
      .references(() => runs.id),
    repoId: text("repo_id")
      .notNull()
      .references(() => trackedRepos.id),
    outcome: runItemOutcomeEnum("outcome").notNull().default("pending"),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    errorMessage: text("error_message"),
  },
  (table) => [uniqueIndex("run_items_run_repo").on(table.runId, table.repoId)],
);
