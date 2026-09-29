import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Contract test for contracts/runs-api.md. The DB layer is mocked (a
 * thenable Proxy standing in for Drizzle's chainable query builder) since
 * this test asserts the HTTP contract shape — status codes and response
 * bodies — not a live database; that's what T028's quickstart run-through
 * is for.
 */

const createRunMock = vi.fn();

class RunAlreadyInProgressError extends Error {
  constructor(public readonly existingRunId: string) {
    super("A population run is already in progress");
  }
}

vi.mock("@/lib/runs/runner", () => ({
  createRun: (...args: unknown[]) => createRunMock(...args),
  RunAlreadyInProgressError,
  advanceRun: vi.fn(),
}));

const selectMock = vi.fn();

vi.mock("@/lib/db/client", () => ({
  db: { select: (...args: unknown[]) => selectMock(...args) },
}));

function chainable<T>(rows: T[]) {
  const handler: ProxyHandler<object> = {
    get(_target, prop) {
      if (prop === "then") {
        return (resolve: (value: T[]) => void) => resolve(rows);
      }
      return () => new Proxy({}, handler);
    },
  };
  return new Proxy({}, handler);
}

describe("POST /api/runs", () => {
  beforeEach(() => {
    createRunMock.mockReset();
    selectMock.mockReset();
  });

  it("returns 202 with a runId and reposTotal when no run is in progress", async () => {
    createRunMock.mockResolvedValue({ runId: "run-1" });
    selectMock.mockReturnValue(chainable([{ reposTotal: 12 }]));

    const { POST } = await import("@/app/api/runs/route");
    const response = await POST();

    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toEqual({
      runId: "run-1",
      status: "in_progress",
      reposTotal: 12,
    });
  });

  it("returns 409 identifying the existing run when one is already in progress", async () => {
    createRunMock.mockRejectedValue(
      new RunAlreadyInProgressError("run-existing"),
    );

    const { POST } = await import("@/app/api/runs/route");
    const response = await POST();

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "run_in_progress",
      runId: "run-existing",
    });
  });
});

describe("GET /api/runs/:runId", () => {
  beforeEach(() => {
    selectMock.mockReset();
  });

  it("returns 200 with progress fields when the run exists", async () => {
    selectMock.mockReturnValue(
      chainable([
        {
          id: "run-1",
          status: "in_progress",
          startedAt: new Date("2026-01-01T00:00:00Z"),
          finishedAt: null,
          reposTotal: 10,
          reposProcessed: 3,
          reposFailed: 0,
        },
      ]),
    );

    const { GET } = await import("@/app/api/runs/[runId]/route");
    const response = await GET(new Request("http://localhost/api/runs/run-1"), {
      params: Promise.resolve({ runId: "run-1" }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      runId: "run-1",
      status: "in_progress",
      reposTotal: 10,
      reposProcessed: 3,
      reposFailed: 0,
      finishedAt: null,
    });
  });

  it("returns 404 when the run doesn't exist", async () => {
    selectMock.mockReturnValue(chainable([]));

    const { GET } = await import("@/app/api/runs/[runId]/route");
    const response = await GET(
      new Request("http://localhost/api/runs/missing"),
      { params: Promise.resolve({ runId: "missing" }) },
    );

    expect(response.status).toBe(404);
  });
});
