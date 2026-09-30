# Tool notes

Gotchas and procedures tied to specific tools/services, grouped by
heading so this is easy to skim or skip once riposte's actual stack is
chosen — only the sections matching whatever gets picked will ever be
relevant. See `engineering-practices.md` for the tool-agnostic reasoning
some of these same lessons also carry.

## Docker

- **A multi-stage build's final stage needs its own minimal base image —
  don't let the build stage's runtime leak into it.** If the build
  stage's base image already bundles a full language runtime, and the
  final stage is based on that *same* image (rather than a lean
  runtime-only base), you end up with the runtime installed twice —
  once from the base image, once from whatever the build stage
  additionally installed. Base the final stage on a genuinely minimal,
  separate image and copy in only the built output.
- **A BuildKit cache mount can shadow a package manager's own store if
  they target the same path.** If the package manager's binaries live
  inside its own content-addressable store directory (a common pattern),
  and a cache mount is pointed at that same path to speed up installs,
  the mount can shadow the binary that's supposed to live there —
  producing a "command not found" failure inside the build that has
  nothing to do with the command itself being missing. Point the cache
  mount at a separate path from wherever the package manager's own
  binaries/symlinks live.
- **A minimal final stage that copies only the built server output can
  silently omit a migrations folder the runtime needs.** If database
  migrations are applied by the running server itself (not a separate
  build step), and the final image stage only copies the compiled
  server output, the raw migration files (SQL + any manifest/journal
  file the migration tool needs) may not be part of that build output at
  all — they need an explicit, separate `COPY` into the final stage.

## Next.js / Vercel (server framework + hosting)

- **Next.js 16 App Router's generated `LayoutProps<"/">` type only exists
  after `.next/types` has been produced by a prior `next dev`/`next build`.**
  A root `layout.tsx` typed as `{ children }: LayoutProps<"/">` passes
  typecheck once you've built locally, then fails cold in CI (or any fresh
  `tsc --noEmit`) with "Cannot find name 'LayoutProps'" — a hidden
  build-order dependency. Use a plain inline props type
  (`{ children: React.ReactNode }`) instead; it's equally correct and has
  no such dependency.
- **A page/route whose content depends on live, frequently-changing DB
  state needs `export const dynamic = "force-dynamic"`** — otherwise
  Next.js may try to statically prerender it at build time, which either
  bakes in stale data or fails outright if the build environment has no
  DB credentials.

- **Don't hardcode a hosting-platform preset if the build tool
  auto-detects it.** A server framework's build tool may already detect
  the deploy target's environment automatically; hardcoding the preset
  anyway can silently change where build output is written (a different
  output directory than what local run/start scripts expect), breaking
  local `build && start` while looking correct in CI.
- **A DOM-emulation-based sanitizer library is a poor fit for an
  ESM-only serverless bundle.** A library that pulls in a full DOM
  emulation (to sanitize HTML server-side, say) may depend on
  CommonJS-only globals internally. Bundled as pure ESM for a serverless
  target, evaluating that dependency can throw immediately — and the
  exception can get swallowed inside the bundler's lazy/dynamic
  module-loading chain instead of surfacing as a clean error, leaving a
  request that just hangs forever with no visible failure. Prefer a
  sanitizer with no real DOM dependency for any server-side code path
  targeting a serverless/edge bundle.
- **`deployment_status` events (and anything triggered by them, like a
  post-deploy smoke test) don't fire for a skipped build.** Skipping a
  platform's build for certain pushes (e.g. docs-only changes) via an
  "ignored build step"-style setting can resolve the platform's own
  status check cleanly, but produces no deployment object at all — so
  any check gated on a deployment event (a smoke test, say) never
  resolves and sits permanently pending if it's required to merge.
  Either deploy on every push, or don't gate merges on
  deployment-triggered checks for paths that might get skipped.

## Drizzle (or any migration-runner tied to a compiled server)

- A minimal Docker final stage (see above) needs the migrations
  directory copied in explicitly, separate from the compiled server
  output — the migration runner needs the raw migration files (and
  whatever manifest/journal file tracks which have run) at runtime, and
  a build step that only bundles `import`ed files won't include them
  automatically.
- **A partial unique index (a `WHERE` clause) is supported** via
  `uniqueIndex("name").on(table.col).where(sql\`...\`)` inside a table's
  third-argument callback — confirmed generating correct SQL
  (`CREATE UNIQUE INDEX ... WHERE ...`) with drizzle-kit 0.31.x. Useful
  for "at most one row in state X" constraints enforced at the database
  level rather than an app-level check-then-insert.
- **`drizzle-kit generate` doesn't need a live database connection** —
  only `migrate`/`push` do. Safe to run with an empty or placeholder
  `DATABASE_URL` when you just need the SQL migration file generated
  from the current schema.

## Postgres (or any DB used behind an append-only assessment/history table)

- The general "latest per key" lesson (`engineering-practices.md`) has a
  concrete SQL shape in Postgres: `DISTINCT ON (key) ... ORDER BY key,
  created_at DESC` picks exactly the latest row per key, in the query
  itself, rather than fetching every historical row and filtering to the
  latest in application code.
- A managed Postgres provider with branch-per-deployment support (copy-
  on-write branching for preview environments, for instance) is a clean
  way to isolate preview/demo data per deployment without every preview
  sharing one production database.
- **Concretely, Neon's Vercel-native integration** (`vercel integration
  add neon`) is this pattern — free-tier compatible (10 branches/project,
  100 CU-hours/month as of 2026), unlike Supabase's equivalent Branching
  feature, which is gated behind its Pro plan. Whether branch-per-preview
  is actually active by default through this CLI path, versus still
  needing one dashboard toggle, wasn't confirmed from docs alone as of
  this writing — verify empirically against the real provisioned
  resource once deployed, don't assume full dashboard parity.
- **That Vercel-managed Neon integration can't repoint an existing
  Vercel project's DB connection to a different/external Neon project**
  — the connection is owned and managed by Vercel, not swappable to a
  Neon project created independently in the Neon console. Moving to a
  Neon-owned setup instead means creating the new Neon project first,
  migrating data into it (`pg_dump --no-owner --no-privileges
  --format=custom` from the old DB's direct connection string, then
  `pg_restore --no-owner --no-privileges --clean --if-exists` into the
  new one — `--no-owner --no-privileges` matters because Neon
  auto-generates a project-specific role, e.g. `neondb_owner`, so the
  source dump's ownership/GRANT statements would otherwise reference a
  role that doesn't exist in the new project), then connecting the new
  Neon project to Vercel via Neon's own "Connect to Vercel" integration
  rather than `vercel integration add neon`.
- A managed provider's free-tier network-transfer cap can be blown
  through by an unbounded query pattern well before the data volume
  itself seems large — a useful early warning sign that a "get current
  state" query is pulling more than it needs to (see the append-only
  table lesson above).
- An in-memory/embedded Postgres implementation is a solid way to test
  query-shape correctness (e.g. "does this query actually bound its
  result set") without needing a live database connection or network
  access in CI.

## pnpm

- **A new dependency that needs to run a postinstall/build script
  (`esbuild`, native bindings, etc.) fails outright with
  `ERR_PNPM_IGNORED_BUILDS`** unless that package is explicitly approved
  — set `onlyBuiltDependencies: [...]` in `pnpm-workspace.yaml` (or run
  `pnpm approve-builds` interactively) rather than treating the failure
  as a broken package or a real install problem.
- **`storeDir` must be set in the workspace config file, not `.npmrc`.**
  A project-level `.npmrc` setting for the package store's location can
  be silently ignored entirely — the actual compatibility check that
  decides whether to reinstall from scratch reads the store location
  from the workspace config file instead. If a stale/mismatched
  store-location error reappears, fix it there, and clear whatever local
  cache file tracks "last validated state" to force a fresh check rather
  than trusting a cached skip while testing.

## Git

- **`git worktree repair` run with no arguments doesn't reliably fix
  worktrees' back-references after an external directory move** (i.e.
  moving the whole repo, main checkout and linked worktrees together,
  with a plain `mv` rather than a git-aware command). Each worktree's own
  pointer file and the main checkout's records about it can go stale and
  need manual fixing rather than a one-command repair.

## GitHub / `gh` CLI

- **A fine-grained personal access token scopes each REST resource
  independently — one permission doesn't imply another.** Granting only
  "Contents: Read," say, fetches commits fine but fails on issues/PRs
  with a permission error; each resource type (Contents, Issues, Pull
  requests, Actions, etc.) needs its own explicit grant even though
  they're all "read" access on the same repo.
- **A non-admin fine-grained token can read a repo's branch-protection
  ruleset but not write it, and can't resolve PR review threads or
  re-run a failed Actions run** — all of these need broader scope than a
  narrowly-scoped automation token should ever be granted. When one of
  these comes up, prepare the exact command/payload and hand it to a
  human with a broader-scoped session to run themselves, rather than
  treating it as a dead end or working around the scope limitation.

## GitHub Actions / GitHub Apps

- **A repository secret can't be literally named the platform's reserved
  automatic-token name** (e.g. `GITHUB_TOKEN` on GitHub Actions) — that
  name is reserved for the platform's own per-run token. A
  broader-scoped token used by automation (a pipeline's account-wide
  PAT, say) needs its own distinct secret name.
- **When automation needs to open pull requests that pass through a
  required-review merge gate, use a dedicated bot/app identity's
  installation token, not the platform's default per-run token.** Two
  reasons: (1) the review-gate reasoning in `engineering-practices.md` —
  self-approval blocks are keyed to the account, not the token; (2) a
  platform may suppress downstream automation from re-triggering on
  content pushed using its own default automatic token, specifically to
  prevent infinite automation loops — which means a required CI check
  would never actually run against a PR opened that way, permanently
  blocking merge. A dedicated app identity's own installation token
  doesn't carry that suppression.

### PR-opening procedure

(Generic shape, adapted from what repo-rater converged on — the
machine/personal-auth-routing half of this stays local to whatever
project reuses it, not repeated here.)

1. Target the trunk branch directly unless a project deliberately uses a
   release-batching branch — and if release automation (see below)
   handles batching already, it shouldn't.
2. Draft the PR body from the repo's actual PR template, filled in
   section by section against what really changed — never freeform,
   even when it feels like it covers the same ground.
3. Write the body to a temp file and pass it via a file-based flag
   (`--body-file` or equivalent) rather than an inline heredoc — an
   escaping/formatting slip in a heredoc body is a real, recurring
   failure mode; a file avoids it entirely.
4. Never open a PR unasked just because a branch was pushed — those are
   two separate authorizations.
5. Never merge, regardless of CI status or how trivial the change looks
   — see the merge-gate lesson in `engineering-practices.md`.

### Release-please (or equivalent trunk-based release automation)

- The mechanism: a single workflow triggered on every push to the
  trunk branch. It reads Conventional Commit history since the last
  release tag and either (a) updates a standing, auto-maintained release
  PR with the computed version bump and changelog, or (b) if the push
  *is* that release PR merging, publishes: creates the version tag and
  the platform's release notes. No separate "cut a release" command —
  merging the standing release PR *is* the release.
- **Pin the version tag's exact format to what the release tool expects
  — a self-chosen "obvious" format can be invisible to it.** A
  component-prefixed tag scheme (`<name>-vX.Y.Z`) needs every tag,
  including a manually-created bootstrap tag, to match that scheme
  exactly — a bare `vX.Y.Z` tag created by hand won't be recognized as a
  prior release, and the tool can fall back to treating the *next*
  release as the project's first ever, pulling in the entire commit
  history into one changelog entry.
- If the automation needs to re-run a failed workflow run and the
  available token lacks the scope for that (see the `gh` CLI section
  above), hand the exact re-run step to a human rather than trying to
  work around the missing scope.

## SolidStart (or any framework with RPC-style server actions)

- **A framework's RPC-style form/server actions usually aren't
  curl-scriptable.** If a login (or any action-driven) flow goes through
  a framework's own action/RPC mechanism rather than a plain HTML form
  POST to the page's own route, a direct `curl` POST to that route just
  re-renders the page — the page route and the action RPC endpoint are
  different things. Scripting against a flow like this needs either
  real browser automation or replicating the framework's specific wire
  protocol; there's no simple HTTP-client shortcut. This generalizes
  beyond one framework — any framework with a similar server-action
  pattern (not just SolidStart) has the same property.

## Vitest (or any test runner alongside a framework with a server/client split)

- A test config that omits the framework's own build plugin (running
  only the base bundler plugin) means any framework-specific import
  aliasing needs to be configured again, separately, for the test
  runner — it won't be picked up automatically the way the real app's
  build config would.
- **Mock a module that imports a server-only action to avoid eager
  server-only imports firing at module load time in tests**, even when
  the action itself is never called. If a component under test imports
  a server action, and that action's module eagerly pulls in
  server-only code (a database client, say) at the top of the file, just
  *importing* the component for a render test can throw (e.g. a missing
  required environment variable) — the action never needs to run for
  this to happen. Mocking that module to a lightweight stub avoids
  triggering the eager import at all. This generalizes to any framework
  with a similar server/client code-splitting pattern, not just one
  specific router library.
- **Confirmed again in riposte, and fixed at the source instead of
  mocking every test:** a Drizzle client built by calling an env-var-
  reading function at module load time (`const db = drizzle(neon(getDatabaseUrl()))`
  at the top of the file) broke any test that transitively imported it —
  even a pure-function unit test that never touched the database. Fix:
  wrap the real client construction in a lazy `Proxy` whose `get` trap
  only builds the client (and only then requires the env var) on first
  actual property access. Importing the module for its types/other
  exports stays side-effect-free; only a real query triggers the env
  check.
- A framework's router-scoped data primitives (anything that needs to
  read from "the current route") typically need the test to actually
  render the component inside that framework's real router/route
  wrapper — just wrapping it in the router's top-level provider isn't
  always enough; it may need an actual route boundary too.

## Vercel CLI

- **The CLI may not support project-scoped access tokens at all, even
  for read-only operations** — a token needs to be scoped at the
  team/account level for local CLI use (`pull`, `build`, even a basic
  list command), independent of whether the platform's own web UI or
  REST API supports project-scoped tokens for other purposes.
- **`vercel integration add <slug>` (alias `vercel install`/`vc i`)
  provisions a marketplace resource and connects it to the linked
  project in one command** — genuinely non-interactive-capable via
  `--plan`, `--metadata`, `--environment`, `--format json`, etc.
  (confirmed against current, 2026-09, Vercel CLI docs). This is the
  actual mechanism for what used to require dashboard clicking, e.g.
  `vercel integration add neon` for a Postgres database — see the Neon
  entry above for the one thing this CLI path didn't confirm.
- `vercel git connect` connects the current directory's linked project
  to its local `.git` remote for automatic Production/Preview
  Deployments — the other half of "no dashboard needed" alongside
  `vercel integration add`.
