import { describe, expect, it } from "vitest";
import { computeFingerprint } from "@/lib/assessment/change-detection";

describe("computeFingerprint (FR-006)", () => {
  const readme = "# My project\n\nDoes a thing.";
  const activity = [
    {
      kind: "commit",
      externalId: "abc123",
      occurredAt: new Date("2026-01-01T00:00:00Z"),
      summary: "Initial commit",
    },
    {
      kind: "issue",
      externalId: "1",
      occurredAt: new Date("2026-01-02T00:00:00Z"),
      summary: "First issue",
    },
  ];

  it("is identical for the same README and activity, regardless of input order", () => {
    const a = computeFingerprint(readme, activity);
    const b = computeFingerprint(readme, [...activity].reverse());
    expect(a).toBe(b);
  });

  it("changes when a new commit/issue/PR is added — no accumulation threshold", () => {
    const before = computeFingerprint(readme, activity);
    const after = computeFingerprint(readme, [
      ...activity,
      {
        kind: "pull_request",
        externalId: "2",
        occurredAt: new Date("2026-01-03T00:00:00Z"),
        summary: "A single new PR",
      },
    ]);
    expect(after).not.toBe(before);
  });

  it("changes when the README changes, even with identical activity", () => {
    const before = computeFingerprint(readme, activity);
    const after = computeFingerprint(readme + "\n\nUpdated goals.", activity);
    expect(after).not.toBe(before);
  });

  it("changes when an existing item's content changes (e.g. an issue's title edited)", () => {
    const before = computeFingerprint(readme, activity);
    const mutated = activity.map((item) =>
      item.externalId === "1" ? { ...item, summary: "Edited title" } : item,
    );
    const after = computeFingerprint(readme, mutated);
    expect(after).not.toBe(before);
  });

  it("normalizes a missing README (null) the same as an empty-string README", () => {
    const withNull = computeFingerprint(null, activity);
    const withEmpty = computeFingerprint("", activity);
    expect(withNull).toBe(withEmpty);
  });
});
