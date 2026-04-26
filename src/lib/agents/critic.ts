import { requestStructuredOutput } from "../structured-output";
import type { ExperimentPlan } from "../types";
import type { PlanningBrief } from "../intake-types";
import {
  criticSummarySchema,
  type CriticSummary,
} from "../workflow-types";

const SYSTEM_PROMPT = `You are Operon AI's internal quality-assurance scientist reviewing a generated experiment plan before it is shown to the user.

Evaluate the output strictly against the requested deliverables:
1. Are reagent concentrations within realistic ranges for this experiment type?
2. Is the timeline physically achievable? (Flag if 48hr incubation is scheduled for 2hrs)
3. Does the validation approach actually measure the requested endpoint and comparator in the planning brief?
4. Are there missing safety notes for hazardous materials?
5. Are catalog numbers plausible for the listed suppliers? (Flag obvious fabrications)
6. Is the budget realistic for a UK lab in 2026?
7. Does the plan preserve the intervention, system, endpoint, comparator, and explicit conditions requested in the planning brief?
8. Are the failure modes specific, actionable, and supported by credible sources rather than generic filler?

Use blockers ONLY for critical output defects that mean the draft should be repaired before it is shown, such as:
- missing or unusable comparator/control design
- validation that does not test the requested endpoint
- obviously fabricated sourcing/costing/protocol support
- impossible timeline logic

Use warnings for weaker but still important quality issues.

Return ONLY valid JSON:
{
  "confidenceScore": 0-100,
  "approved": true if score >= 70,
  "warnings": ["specific named issues, e.g. 'FITC-dextran dose not specified — confirm 44mg/kg'"],
  "blockers": ["critical issues that prevent lab execution"],
  "summary": "one sentence"
}`;

export async function runCritic(
  plan: ExperimentPlan,
  planningBrief: PlanningBrief | null,
): Promise<CriticSummary> {
  return requestStructuredOutput({
    systemPrompt: SYSTEM_PROMPT,
    userMessage: JSON.stringify({
      planningBrief,
      plan,
    }),
    maxTokens: 1024,
    schema: criticSummarySchema,
    normalize: (critic) => ({
      ...critic,
      approved: critic.confidenceScore >= 70,
    }),
  });
}
