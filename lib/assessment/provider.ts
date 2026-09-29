import { generateObject } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { z } from "zod";
import { getLlmConfig, type LlmConfig } from "@/lib/config/env";

/**
 * The Vercel AI SDK's provider abstraction is the *only* place vendor
 * selection happens (Constitution Principle VII, NON-NEGOTIABLE) — nothing
 * downstream of generateAssessment() ever branches on which vendor is
 * configured. Swapping providers, including to a self-hosted
 * OpenAI-compatible server (Ollama, vLLM, LM Studio), is a config change
 * (LLM_PROVIDER/LLM_MODEL/LLM_BASE_URL), never a code change.
 */
function resolveModel(config: LlmConfig) {
  switch (config.provider) {
    case "openai":
      return createOpenAI({ apiKey: config.apiKey })(config.model);
    case "anthropic":
      return createAnthropic({ apiKey: config.apiKey })(config.model);
    case "openai-compatible":
      return createOpenAICompatible({
        name: "self-hosted",
        apiKey: config.apiKey,
        baseURL: config.baseUrl as string,
      })(config.model);
  }
}

const evidenceItemSchema = z.object({
  kind: z.enum(["commit", "issue", "pull_request"]),
  externalId: z.string(),
});

const assessmentSchema = z.object({
  completionEstimate: z.number().min(0).max(100),
  statusTier: z.enum(["on_track", "at_risk", "stalled"]),
  verdict: z.string().min(1),
  evidence: z.array(evidenceItemSchema),
});

export interface AssessmentActivityItem {
  kind: "commit" | "issue" | "pull_request";
  externalId: string;
  occurredAt: string;
  summary: string;
}

export interface AssessmentInput {
  repoOwner: string;
  repoName: string;
  readme: string | null;
  activity: AssessmentActivityItem[];
}

export interface AssessmentResult {
  completionEstimate: number;
  statusTier: "on_track" | "at_risk" | "stalled";
  verdict: string;
  /** (kind, externalId) pairs — the caller resolves these to
   * activity_records.id values, since this module has no DB dependency. */
  evidence: { kind: string; externalId: string }[];
}

/**
 * FR-004: generate an evidence-grounded verdict against the repo's own
 * README. FR-005: an assessment with no supporting evidence is rejected —
 * enforced here as a thrown error, not a silently-stored empty array, so
 * the caller (lib/runs/runner.ts) can record it as a failed run_item
 * rather than a successful one with nothing behind it.
 */
export async function generateAssessment(
  input: AssessmentInput,
): Promise<AssessmentResult> {
  const model = resolveModel(getLlmConfig());

  const { object } = await generateObject({
    model,
    schema: assessmentSchema,
    prompt: buildPrompt(input),
  });

  if (object.evidence.length === 0) {
    throw new Error(
      "Assessment rejected: no supporting evidence cited (FR-005).",
    );
  }

  return object;
}

function buildPrompt(input: AssessmentInput): string {
  const activityLines = input.activity
    .slice(0, 200)
    .map((a) => `- [${a.kind} ${a.externalId}] ${a.occurredAt}: ${a.summary}`)
    .join("\n");

  return `You are assessing the real progress of a GitHub repository, "${input.repoOwner}/${input.repoName}", against its own stated goals.

README (the repo's stated goals):
${input.readme ?? "(no README content)"}

Recent activity (commits, issues, pull requests):
${activityLines || "(no activity)"}

Task: produce a completion estimate (0-100), a status tier (on_track,
at_risk, or stalled), a written verdict, and the specific activity items
(by kind and id, from the list above) that support your verdict. Every
claim must be grounded in the activity listed above — never invent
evidence. If you cannot cite at least one real activity item, return an
empty evidence array rather than fabricating one.`;
}
