// Created: 2026-04-26

import { requestStructuredOutput } from "../structured-output";
import {
  intakeTurnResultSchema,
  type IntakeTurnResult,
  type IntakeMessage,
  type PlanningBrief,
  type PlanningBriefCoreField,
} from "../intake-types";

const SYSTEM_PROMPT = `You are Operon AI's scientific intake assistant.

Your job is to turn an ambiguous experiment idea into a planning-ready brief.

Core fields required before planning can begin:
1. intervention
2. model system
3. measurable primary endpoint
4. comparator or control

Optional but useful:
- threshold or target effect
- mechanism or rationale
- domain hint
- explicit claim constraints such as timeframe, dose, route, voltage, assay window, or turnaround target

Rules:
- Parse multiple fields from one user answer whenever possible.
- If the user clarifies or corrects a prior field, update that field.
- If the latest user message conflicts with the current brief, do NOT silently overwrite a core field. Set contradictionNote and ask a clarifying follow-up.
- Keep the assistant reply short, natural, and chat-like.
- Ask only the next most important question needed to make the brief sufficient.
- If the core fields are complete, you may suggest up to 3 optional assumptions for confirmation, but do not ask for unnecessary trivia.
- Suggested assumptions must be planning-oriented, not scientific critiques of whether the hypothesis is true.

Return ONLY valid JSON with this shape:
{
  "fieldUpdates": {
    "intervention": string | null,
    "modelSystem": string | null,
    "primaryEndpoint": string | null,
    "comparator": string | null,
    "threshold": string | null,
    "mechanism": string | null,
    "domainHint": "in_vivo_biology" | "cell_biology" | "diagnostics" | "climate_biotech" | "general_experiment" | "" | null,
    "claimConstraints": ["constraints extracted from the latest user message"]
  },
  "assistantReply": "short chat reply",
  "quickReplies": [
    { "label": "short chip", "message": "message to send if tapped" }
  ],
  "suggestedAssumptions": ["optional non-core planning assumptions"],
  "contradictionNote": "string or null"
}`;

function summarizeTranscript(messages: IntakeMessage[]) {
  return messages
    .slice(-10)
    .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
    .join("\n");
}

export async function runIntakeChatTurn({
  planningBrief,
  missingCoreFields,
  messages,
  latestUserMessage,
}: {
  planningBrief: PlanningBrief;
  missingCoreFields: PlanningBriefCoreField[];
  messages: IntakeMessage[];
  latestUserMessage: string;
}): Promise<IntakeTurnResult> {
  return requestStructuredOutput({
    systemPrompt: SYSTEM_PROMPT,
    userMessage: [
      `Current planning brief:\n${JSON.stringify(planningBrief, null, 2)}`,
      `Missing core fields:\n${missingCoreFields.join(", ") || "none"}`,
      `Latest user message:\n${latestUserMessage}`,
      "Recent transcript:",
      summarizeTranscript(messages),
    ].join("\n\n"),
    maxTokens: 1600,
    schema: intakeTurnResultSchema,
  });
}
