import { z } from "zod";
import { requestStructuredOutput } from "../structured-output";
import type { QuestionProfile } from "../workflow-types";
import type { PlanningBrief } from "../intake-types";
import {
  budgetLineSchema,
  experimentPlanSchema,
  failureModeSchema,
  materialSchema,
  protocolStepSchema,
  sourceSchema,
  timelinePhaseSchema,
  type ExperimentPlan,
} from "../types";

const SYSTEM_PROMPT = `You are an expert experimental scientist and lab operations specialist at a world-class CRO.

Your task: generate a COMPLETE, OPERATIONALLY EXECUTABLE experiment plan.

CRITICAL REQUIREMENTS — violating any of these is a failure:
1. Every protocol step MUST cite a real published source (protocols.io, Nature Protocols, Bio-protocol, JOVE, or peer-reviewed paper). Include the URL.
2. Every reagent MUST include: supplier name, REAL catalog number, quantity, unit cost in GBP. Use Sigma-Aldrich (sigmaaldrich.com), Thermo Fisher, or equivalent. Do NOT invent catalog numbers — use only catalog numbers you have high confidence are real.
3. Budget MUST use exact numbers (e.g., 340), never ranges (e.g., "300–500"). Sum to a realistic 2026 UK market total.
4. Timeline MUST reflect lab reality: cell culture takes days, PCR takes hours, animal studies take weeks. Do not compress.
5. The validation approach MUST directly test the stated measurable outcome and threshold.
6. Use the planning brief to preserve the requested intervention, comparator, endpoint, and stated conditions wherever operationally possible.
7. Include a dedicated failureModes array with 3 to 6 experiment-type-specific ways this plan can fail in practice. Each failure mode must explain the signal to watch, the mitigation, and include a real source URL.

Use the provided Tavily evidence as your primary grounding. Extract protocol URLs and cite them in steps.

SIZE / BREVITY RULES:
- Return 6 to 10 protocol steps, not more
- Return 5 to 12 materials, not more
- Return 5 to 10 budget lines, not more
- Return 3 to 5 timeline phases, not more
- Return 3 to 6 failure modes, not more
- Return 5 to 8 sources, not more
- Keep each protocol description to 2 sentences maximum
- Keep validationApproach to 4 concise sentences maximum
- Keep each failure-mode field concise; mitigation should be 1 sentence when possible
- Keep notes concise and avoid long quotations from sources

CITATION SOURCES — cite only from these in protocol steps:
- Protocols: protocols.io, bio-protocol.org, nature.com/nprot, jove.com, openwetware.org
- Papers: pubmed.ncbi.nlm.nih.gov, pmc.ncbi.nlm.nih.gov, biorxiv.org
- Suppliers: sigmaaldrich.com, thermofisher.com, promega.com, qiagen.com, idtdna.com, atcc.org, addgene.org

CATALOG NUMBER RULES:
- Sigma-Aldrich format: letter + 4–5 digits (e.g. D1537, L6876, F7508)
- Thermo Fisher format: alphanumeric (e.g. 15596026, A10931)
- Promega format: letter + 4 digits (e.g. E1501, G7571)
- If not confident a catalog number is real, note "verify catalog number" in criticalNote — never fabricate

OUTPUT FORMAT: Return ONLY valid JSON with EXACTLY these field names (no extras, no renaming):
{
  "generatedAt": "2026-04-25",
  "hypothesis": "the hypothesis string",
  "title": "short descriptive title",
  "summary": "2-sentence top-line summary",
  "protocol": [
    {
      "stepNumber": 1,
      "title": "step title",
      "description": "full description",
      "duration": "e.g. 30 min",
      "sourceProtocol": "e.g. protocols.io/...",
      "sourceUrl": "full URL",
      "criticalNote": "optional warning"
    }
  ],
  "materials": [
    {
      "name": "reagent name",
      "supplier": "Sigma-Aldrich",
      "catalogNumber": "D1537",
      "quantity": "100 mg",
      "unitCost": 340,
      "totalCost": 340,
      "notes": "optional"
    }
  ],
  "budget": [
    { "category": "Reagents", "item": "item name", "cost": 340, "currency": "GBP" }
  ],
  "totalBudgetEstimate": 0,
  "currency": "GBP",
  "timeline": [
    {
      "phase": 1,
      "title": "Week 1–2 | Phase title",
      "duration": "2 weeks",
      "dependencies": ["list"],
      "milestones": ["list"]
    }
  ],
  "validationApproach": "description of how the hypothesis endpoint is tested",
  "failureModes": [
    {
      "title": "short failure mode name",
      "whyItFails": "what breaks and why",
      "signalToWatch": "observable signal or metric",
      "mitigation": "how to reduce the risk",
      "sourceTitle": "supporting source title",
      "sourceUrl": "full URL"
    }
  ],
  "sources": [
    { "title": "source title", "url": "full URL", "type": "protocol" }
  ]
}

No prose. No markdown. No code fences. The generatedAt field must be "2026-04-25".`;

const SUMMARY_MAX = 400;
const VALIDATION_MAX = 2600;
const PROTOCOL_DESCRIPTION_MAX = 700;
const PROTOCOL_CRITICAL_NOTE_MAX = 240;
const MATERIAL_NOTES_MAX = 200;
const BUDGET_NOTES_MAX = 180;
const FAILURE_WHY_MAX = 360;
const FAILURE_SIGNAL_MAX = 220;
const FAILURE_MITIGATION_MAX = 320;
const FAILURE_SOURCE_TITLE_MAX = 180;

function normalizeWhitespace(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function splitSentences(text: string) {
  return normalizeWhitespace(text)
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function compactText(
  text: string,
  maxLength: number,
  {
    preferredSentenceCount = 2,
  }: {
    preferredSentenceCount?: number;
  } = {},
) {
  const normalized = normalizeWhitespace(text);
  if (normalized.length <= maxLength) {
    return normalized;
  }

  const sentences = splitSentences(normalized);
  if (sentences.length > 0) {
    for (let count = Math.min(preferredSentenceCount, sentences.length); count >= 1; count -= 1) {
      const candidate = sentences.slice(0, count).join(" ");
      if (candidate.length <= maxLength) {
        return candidate;
      }
    }
  }

  const clipped = normalized.slice(0, Math.max(1, maxLength - 1));
  const lastBoundary = Math.max(
    clipped.lastIndexOf(". "),
    clipped.lastIndexOf("; "),
    clipped.lastIndexOf(", "),
    clipped.lastIndexOf(" "),
  );
  const safeSlice = lastBoundary > Math.floor(maxLength * 0.6)
    ? clipped.slice(0, lastBoundary)
    : clipped;

  return `${safeSlice.trim()}…`;
}

const plannerNormalizedPlanSchema = experimentPlanSchema.extend({
  summary: z.string().min(1).max(400),
  validationApproach: z.string().min(1).max(2600),
  protocol: z.array(
    protocolStepSchema.extend({
      title: z.string().min(1).max(140),
      description: z.string().min(1).max(700),
      duration: z.string().min(1).max(80),
      sourceProtocol: z.string().min(1).max(200).optional(),
      criticalNote: z.string().min(1).max(240).optional(),
    }),
  ).min(6).max(10),
  materials: z.array(
    materialSchema.extend({
      name: z.string().min(1).max(160),
      supplier: z.string().min(1).max(80),
      catalogNumber: z.string().min(1).max(40),
      quantity: z.string().min(1).max(80),
      notes: z.string().max(200).optional(),
    }),
  ).min(5).max(12),
  budget: z.array(
    budgetLineSchema.extend({
      category: z.string().min(1).max(80),
      item: z.string().min(1).max(160),
      notes: z.string().max(180).optional(),
    }),
  ).min(5).max(10),
  timeline: z.array(
    timelinePhaseSchema.extend({
      title: z.string().min(1).max(120),
      duration: z.string().min(1).max(60),
      dependencies: z.array(z.string().max(120)).max(6),
      milestones: z.array(z.string().max(140)).max(6),
    }),
  ).min(3).max(5),
  failureModes: z.array(
    failureModeSchema.extend({
      title: z.string().min(1).max(120),
      whyItFails: z.string().min(1).max(360),
      signalToWatch: z.string().min(1).max(220),
      mitigation: z.string().min(1).max(320),
      sourceTitle: z.string().min(1).max(180),
    }),
  ).min(3).max(6),
  sources: z.array(sourceSchema).min(5).max(8),
});

const plannerModelOutputSchema = experimentPlanSchema.extend({
  summary: z.string().min(1).max(1400),
  validationApproach: z.string().min(1).max(3600),
  protocol: z.array(
    protocolStepSchema.extend({
      title: z.string().min(1).max(140),
      description: z.string().min(1).max(1400),
      duration: z.string().min(1).max(80),
      sourceProtocol: z.string().min(1).max(200).optional(),
      criticalNote: z.string().min(1).max(420).optional(),
    }),
  ).min(6).max(10),
  materials: z.array(
    materialSchema.extend({
      name: z.string().min(1).max(160),
      supplier: z.string().min(1).max(80),
      catalogNumber: z.string().min(1).max(40),
      quantity: z.string().min(1).max(80),
      notes: z.string().max(320).optional(),
    }),
  ).min(5).max(12),
  budget: z.array(
    budgetLineSchema.extend({
      category: z.string().min(1).max(80),
      item: z.string().min(1).max(160),
      notes: z.string().max(320).optional(),
    }),
  ).min(5).max(10),
  timeline: z.array(
    timelinePhaseSchema.extend({
      title: z.string().min(1).max(120),
      duration: z.string().min(1).max(60),
      dependencies: z.array(z.string().max(120)).max(6),
      milestones: z.array(z.string().max(140)).max(6),
    }),
  ).min(3).max(5),
  failureModes: z.array(
    failureModeSchema.extend({
      title: z.string().min(1).max(120),
      whyItFails: z.string().min(1).max(800),
      signalToWatch: z.string().min(1).max(420),
      mitigation: z.string().min(1).max(700),
      sourceTitle: z.string().min(1).max(260),
    }),
  ).min(3).max(6),
  sources: z.array(sourceSchema).min(5).max(8),
});

export async function runPlanner(
  hypothesis: string,
  profile: QuestionProfile,
  tavilyEvidence: string,
  planningBrief: PlanningBrief | null,
  feedbackExamples?: string,
  qaFeedback?: string,
): Promise<ExperimentPlan> {
  const userContent = [
    `Hypothesis: ${hypothesis}`,
    `Experiment class: ${profile.experimentClass}`,
    `Key terms: ${profile.keyTerms.join(", ")}`,
    `Primary endpoint: ${profile.primaryEndpoint}`,
    `Model system: ${profile.modelSystem}`,
    `Intervention: ${profile.intervention}`,
    planningBrief
      ? `Planning brief:\n${JSON.stringify(planningBrief, null, 2)}`
      : "Planning brief: unavailable",
    "",
    "Tavily evidence (use these sources and URLs in your protocol):",
    tavilyEvidence,
    feedbackExamples ? `\nScientist corrections from prior runs:\n${feedbackExamples}` : "",
    qaFeedback ? `\nInternal QA repair request:\n${qaFeedback}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return requestStructuredOutput({
    systemPrompt: SYSTEM_PROMPT,
    userMessage: userContent,
    maxTokens: 8192,
    schema: plannerModelOutputSchema,
    normalize: (validatedPlan) => {
      return plannerNormalizedPlanSchema.parse({
        ...validatedPlan,
        generatedAt: "2026-04-25",
        summary: compactText(validatedPlan.summary, SUMMARY_MAX),
        validationApproach: compactText(validatedPlan.validationApproach, VALIDATION_MAX, {
          preferredSentenceCount: 4,
        }),
        protocol: validatedPlan.protocol.map((step) => ({
          ...step,
          description: compactText(step.description, PROTOCOL_DESCRIPTION_MAX),
          criticalNote: step.criticalNote
            ? compactText(step.criticalNote, PROTOCOL_CRITICAL_NOTE_MAX, {
                preferredSentenceCount: 1,
              })
            : undefined,
        })),
        materials: validatedPlan.materials.map((material) => ({
          ...material,
          notes: material.notes
            ? compactText(material.notes, MATERIAL_NOTES_MAX, {
                preferredSentenceCount: 1,
              })
            : undefined,
        })),
        budget: validatedPlan.budget.map((line) => ({
          ...line,
          notes: line.notes
            ? compactText(line.notes, BUDGET_NOTES_MAX, {
                preferredSentenceCount: 1,
              })
            : undefined,
        })),
        failureModes: validatedPlan.failureModes.map((failureMode) => ({
          ...failureMode,
          whyItFails: compactText(failureMode.whyItFails, FAILURE_WHY_MAX),
          signalToWatch: compactText(failureMode.signalToWatch, FAILURE_SIGNAL_MAX, {
            preferredSentenceCount: 1,
          }),
          mitigation: compactText(failureMode.mitigation, FAILURE_MITIGATION_MAX, {
            preferredSentenceCount: 1,
          }),
          sourceTitle: compactText(failureMode.sourceTitle, FAILURE_SOURCE_TITLE_MAX, {
            preferredSentenceCount: 1,
          }),
        })),
        totalBudgetEstimate: validatedPlan.budget.reduce((sum, line) => sum + line.cost, 0),
        currency: validatedPlan.currency || validatedPlan.budget[0]?.currency || "GBP",
      });
    },
  });
}
