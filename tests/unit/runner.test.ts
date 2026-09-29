import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Regression test for a bug T028's live run-through caught: the neon-http
 * driver wraps the real Postgres error (which carries `code: "23505"`) in
 * an outer "Failed query" error via `.cause`, rather than exposing `code`
 * on the thrown error directly. A prior version of `isUniqueViolation` only
 * checked the outer error's `code`, so a real concurrent-run conflict fell
 * through to an unhandled 500 instead of the spec'd 409 — never caught by
 * the contract test, which mocks `createRun` entirely and never exercises
 * real Postgres error shapes.
 */

// Builds the resolution/rejection lazily inside `then` (only invoked once
// the chain is actually awaited) rather than eagerly, so a rejection case
// doesn't create a dangling unhandled-rejection between mock setup and the
// `await` inside createRun.
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

vi.mock("@/lib/db/client", () => ({
  db: {
    insert: (...args: unknown[]) => insertMock(...args),
    select: (...args: unknown[]) => selectMock(...args),
  },
}));

describe("createRun", () => {
  beforeEach(() => {
    insertMock.mockReset();
    selectMock.mockReset();
  });

  it("maps a wrapped 23505 unique-violation (real neon-http error shape) to RunAlreadyInProgressError", async () => {
    const pgError = Object.assign(
      new Error("duplicate key value violates unique constraint"),
      {
        code: "23505",
        constraint: "runs_single_in_progress",
      },
    );
    const wrapped = new Error(
      'Failed query: insert into "runs" (...) values (...) returning "id"',
      { cause: pgError },
    );
    insertMock.mockReturnValue(
      chainable(() => {
        throw wrapped;
      }),
    );
    selectMock.mockReturnValue(chainable(() => [{ id: "existing-run-id" }]));

    const { createRun, RunAlreadyInProgressError } =
      await import("@/lib/runs/runner");

    await expect(createRun()).rejects.toMatchObject(
      new RunAlreadyInProgressError("existing-run-id"),
    );
  });
});
