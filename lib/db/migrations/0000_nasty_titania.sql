CREATE TYPE "public"."activity_kind" AS ENUM('commit', 'issue', 'pull_request');--> statement-breakpoint
CREATE TYPE "public"."exclusion_reason" AS ENUM('fork', 'archived', 'no_readme', 'no_activity');--> statement-breakpoint
CREATE TYPE "public"."inclusion_state" AS ENUM('included', 'excluded');--> statement-breakpoint
CREATE TYPE "public"."run_item_outcome" AS ENUM('pending', 'succeeded', 'failed', 'skipped_unchanged');--> statement-breakpoint
CREATE TYPE "public"."run_status" AS ENUM('in_progress', 'completed', 'failed', 'partial');--> statement-breakpoint
CREATE TYPE "public"."status_tier" AS ENUM('on_track', 'at_risk', 'stalled');--> statement-breakpoint
CREATE TABLE "activity_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"repo_id" text NOT NULL,
	"kind" "activity_kind" NOT NULL,
	"external_id" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"summary" text NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"repo_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completion_estimate" numeric(5, 2) NOT NULL,
	"status_tier" "status_tier" NOT NULL,
	"verdict" text NOT NULL,
	"evidence_refs" uuid[] NOT NULL,
	"inputs_fingerprint" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "run_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"repo_id" text NOT NULL,
	"outcome" "run_item_outcome" DEFAULT 'pending' NOT NULL,
	"processed_at" timestamp with time zone,
	"error_message" text
);
--> statement-breakpoint
CREATE TABLE "runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" "run_status" NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"repos_total" integer NOT NULL,
	"repos_processed" integer DEFAULT 0 NOT NULL,
	"repos_failed" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tracked_repos" (
	"id" text PRIMARY KEY NOT NULL,
	"owner" text NOT NULL,
	"name" text NOT NULL,
	"is_fork" boolean NOT NULL,
	"is_archived" boolean NOT NULL,
	"has_readme" boolean NOT NULL,
	"inclusion_state" "inclusion_state" NOT NULL,
	"exclusion_reason" "exclusion_reason",
	"last_activity_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activity_records" ADD CONSTRAINT "activity_records_repo_id_tracked_repos_id_fk" FOREIGN KEY ("repo_id") REFERENCES "public"."tracked_repos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_repo_id_tracked_repos_id_fk" FOREIGN KEY ("repo_id") REFERENCES "public"."tracked_repos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "run_items" ADD CONSTRAINT "run_items_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "run_items" ADD CONSTRAINT "run_items_repo_id_tracked_repos_id_fk" FOREIGN KEY ("repo_id") REFERENCES "public"."tracked_repos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "activity_records_repo_kind_external_id" ON "activity_records" USING btree ("repo_id","kind","external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "run_items_run_repo" ON "run_items" USING btree ("run_id","repo_id");--> statement-breakpoint
CREATE UNIQUE INDEX "runs_single_in_progress" ON "runs" USING btree ("status") WHERE "runs"."status" = 'in_progress';