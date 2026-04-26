// Created: 2026-04-26

import type { PlanningBrief } from "../intake-types";
import { requestStructuredOutput } from "../structured-output";
import type { ExperimentPlan } from "../types";
import type { QuestionProfile } from "../workflow-types";
import {
  reviewTurnResultSchema,
  type ReviewChatMessage,
  type ReviewTurnResult,
} from "../review-types";

const SYSTEM_PROMPT = `You are Operon AI's scientist review assistant.

Your job is to turn natural-language scientist feedback into structured corrections that can improve future plans for similar experiments.

Rules:
- The scientist may speak naturally. Extract as much structure as possible.
- Each saved correction must include:
  1. section: protocol | materials | budget | timeline | validation
  2. originalText: the thing in the current plan that should change
  3. correctedText: what it should be changed to
  4. reason: why the change matters
  5. rating: 1-5 if the scientist explicitly signals severity/importance, otherwise null
- If the scientist's message is too vague to identify originalText, correctedText, or the section, ask one concise follow-up question and do not mark the correction ready to confirm yet.
- If the scientist gives multiple clear corrections in one message, extract all of them.
- Keep the assistant reply short, natural, and chat-like.
- Only use content that is actually grounded in the current plan or clearly stated by the scientist.

Return ONLY valid JSON:
{
  "assistantReply": "short response",
  "extractedCorrections": [
    {
      "section": "protocol" | "materials" | "budget" | "timeline" | "validation",
      "originalText": "text from the current plan or scientist description",
      "correctedText": "the corrected version",
      "reason": "why this should change",
      "rating": 1 | 2 | 3 | 4 | 5 | null
    }
  ],
  "readyToConfirm": true | false
}`;

function summarizeTranscript(messages: ReviewChatMessage[]) {
  return messages
    .slice(-10)
    .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
    .join("\n");
}

function summarizePlan(plan: ExperimentPlan) {
  return JSON.stringify(
    {
      title: plan.title,
      hypothesis: plan.hypothesis,
      protocol: plan.protocol.map((step) => ({
        stepNumber: step.stepNumber,
        title: step.title,
        description: step.description,
      })),
      materials: plan.materials.map((material) => ({
        name: material.name,
        supplier: material.supplier,
        catalogNumber: material.catalogNumber,
      })),
      budget: plan.budget.map((line) => ({
        category: line.category,
        item: line.item,
        cost: line.cost,
      })),
      timeline: plan.timeline.map((phase) => ({
        phase: phase.phase,
        title: phase.title,
        duration: phase.duration,
      })),
      validationApproach: plan.validationApproach,
    },
    null,
    2,
  );
}

export async function runReviewChatTurn({
  plan,
  planningBrief,
  profile,
  messages,
  latestUserMessage,
}: {
  plan: ExperimentPlan;
  planningBrief: PlanningBrief | null;
  profile: QuestionProfile | null;
  messages: ReviewChatMessage[];
  latestUserMessage: string;
}): Promise<ReviewTurnResult> {
  return requestStructuredOutput({
    systemPrompt: SYSTEM_PROMPT,
    userMessage: [
      `Current plan context:\n${summarizePlan(plan)}`,
      planningBrief ? `Planning brief:\n${JSON.stringify(planningBrief, null, 2)}` : "",
      profile ? `Question profile:\n${JSON.stringify(profile, null, 2)}` : "",
      `Latest scientist message:\n${latestUserMessage}`,
      "Recent transcript:",
      summarizeTranscript(messages),
    ]
      .filter(Boolean)
      .join("\n\n"),
    maxTokens: 1600,
    schema: reviewTurnResultSchema,
  });
}
