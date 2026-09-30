import { beforeEach, describe, expect, it, vi } from "vitest";
import { assessments, runItems, runs } from "@/lib/db/schema";
import type { GitHubClient } from "@/lib/github/client";

/**
 * speckit-analyze finding U1: spec.md's Acceptance Scenario 3 (a repo's
 * prior assessment stays in history, unmodified, once a new one is
 * generated) had no dedicated test — it only held by construction, because
 * nothing in the codebase ever issues an UPDATE against `assessments`
 * (data-model.md: "insert-only"). This test guards that guarantee directly
 * against advanceRun()'s actual write path, rather than relying on no one
 * ever adding one by accident.
 */

// Same lazy-chainable pattern as runner.test.ts — resolves only once
// awaited, so a rejection case doesn't create a dangling unhandled
// rejection between mock setup and the real `await`.
function chainable<T>(getValue: () => T) {
  const handler: ProxyHandler<object> = {
    get(_target, prop) {
      if (prop === "then") {
        return (
          resolve: (value: T) => void,
          reject: (err: unknown) => void,
        ) => {
          try {
            resolve(getValue());
          } catch (err) {
            reject(err);
          }
        };
      }
      return () => new Proxy({}, handler);
    },
  };
  return new Proxy({}, handler);
}

const insertMock = vi.fn();
const selectMock = vi.fn();
const updateMock = vi.fn();

vi.mock("@/lib/db/client", () => ({
  db: {
    insert: (...args: unknown[]) => insertMock(...args),
    select: (...args: unknown[]) => selectMock(...args),
    update: (...args: unknown[]) => updateMock(...args),
  },
}));

vi.mock("@/lib/repos/discovery", () => ({
  discoverAccount: vi.fn(),
}));

vi.mock("@/lib/assessment/change-detection", () => ({
  needsReassessment: vi.fn(),
}));

vi.mock("@/lib/assessment/provider", () => ({
  generateAssessment: vi.fn(),
}));

describe("advanceRun — assessment history (FR-007)", () => {
  beforeEach(() => {
    insertMock.mockReset();
    selectMock.mockReset();
    updateMock.mockReset();
  });

  it("inserts a new assessment for a changed repo without ever updating an existing one", async () => {
    const { needsReassessment } =
      await import("@/lib/assessment/change-detection");
    const { generateAssessment } = await import("@/lib/assessment/provider");
    vi.mocked(needsReassessment).mockResolvedValue({
      needed: true,
      fingerprint: "new-fingerprint",
    });
    vi.mocked(generateAssessment).mockResolvedValue({
      completionEstimate: 80,
      statusTier: "on_track",
      verdict: "Ships the feature the README describes.",
      evidence: [{ kind: "commit", externalId: "abc123" }],
    });

    const repo = {
      id: "repo-1",
      owner: "acme",
      name: "widget",
      hasReadme: false,
    };
    const item = { id: "item-1", runId: "run-1" };
    const activityRow = {
      id: "activity-1",
      kind: "commit",
      externalId: "abc123",
      occurredAt: new Date("2026-01-01T00:00:00Z"),
      summary: "Initial commit",
    };

    selectMock
      .mockReturnValueOnce(
        chainable(() => [{ id: "run-1", status: "in_progress" }]),
      ) // run lookup
      .mockReturnValueOnce(chainable(() => [{ value: 1 }])) // existing run_items — skip discovery
      .mockReturnValueOnce(chainable(() => [{ item, repo }])) // first batch
      .mockReturnValueOnce(chainable(() => [activityRow])) // activity_records for repo
      .mockReturnValueOnce(chainable(() => [])) // second batch — empty, ends the loop
      .mockReturnValueOnce(chainable(() => [{ value: 0 }])) // remaining pending count
      .mockReturnValueOnce(chainable(() => [{ value: 0 }])); // failed count

    insertMock.mockReturnValue(chainable(() => undefined));
    updateMock.mockReturnValue(chainable(() => undefined));

    const { advanceRun } = await import("@/lib/runs/runner");
    await advanceRun("run-1", {} as GitHubClient);

    const insertedTables = insertMock.mock.calls.map((call) => call[0]);
    expect(insertedTables).toContain(assessments);

    const updatedTables = updateMock.mock.calls.map((call) => call[0]);
    expect(updatedTables).not.toContain(assessments);
    expect(updatedTables).toContain(runItems);
    expect(updatedTables).toContain(runs);
  });
});
