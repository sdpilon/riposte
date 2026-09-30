import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * speckit-analyze finding H1: FR-005 ("reject an assessment with no
 * supporting evidence") was implemented in provider.ts but had no
 * regression test guarding the rejection path.
 */

const generateObjectMock = vi.fn();

vi.mock("ai", () => ({
  generateObject: (...args: unknown[]) => generateObjectMock(...args),
}));

vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: () => () => ({}),
}));

vi.mock("@ai-sdk/anthropic", () => ({
  createAnthropic: () => () => ({}),
}));

vi.mock("@ai-sdk/openai-compatible", () => ({
  createOpenAICompatible: () => () => ({}),
}));

vi.mock("@/lib/config/env", () => ({
  getLlmConfig: () => ({
    provider: "openai" as const,
    model: "gpt-test",
    apiKey: "test-key",
  }),
}));

describe("generateAssessment (FR-005)", () => {
  beforeEach(() => {
    generateObjectMock.mockReset();
  });

  it("rejects an assessment with no supporting evidence", async () => {
    generateObjectMock.mockResolvedValue({
      object: {
        completionEstimate: 50,
        statusTier: "at_risk",
        verdict: "Some vague claim with nothing behind it.",
        evidence: [],
      },
    });

    const { generateAssessment } = await import("@/lib/assessment/provider");

    await expect(
      generateAssessment({
        repoOwner: "acme",
        repoName: "widget",
        readme: "# Widget",
        activity: [],
      }),
    ).rejects.toThrow(/FR-005/);
  });

  it("accepts an assessment that cites at least one piece of evidence", async () => {
    generateObjectMock.mockResolvedValue({
      object: {
        completionEstimate: 80,
        statusTier: "on_track",
        verdict: "Ships the feature described in the README.",
        evidence: [{ kind: "commit", externalId: "abc123" }],
      },
    });

    const { generateAssessment } = await import("@/lib/assessment/provider");

    const result = await generateAssessment({
      repoOwner: "acme",
      repoName: "widget",
      readme: "# Widget",
      activity: [],
    });

    expect(result.evidence).toHaveLength(1);
  });
});
