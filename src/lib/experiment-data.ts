// Created: 2026-04-25

import { z, type ZodType } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "./db";
import { getDefaultProjectId } from "./default-project";
import { planningBriefSchema } from "./intake-types";
import { appliedFeedbackTraceSchema } from "./review-types";
import {
  budgetLineSchema,
  experimentPlanSchema,
  failureModeSchema,
  materialSchema,
  protocolStepSchema,
  sourceSchema,
  timelinePhaseSchema,
  type ExperimentDetailResponse,
  type ExperimentListItem,
  type ExperimentPlan,
  type Source,
} from "./types";
import {
  criticSummarySchema,
  literatureQcSummarySchema,
  questionProfileSchema,
  type CriticSummary,
  type ReviewStatus,
  type WorkflowVersion,
} from "./workflow-types";

const legacyTextSectionSchema = z.array(
  z.object({
    title: z.string(),
    detail: z.string(),
  }),
);

const legacyBudgetLineSchema = z.array(
  z.object({
    category: z.string(),
    estimate: z.string(),
    note: z.string().optional(),
  }),
);

const controlsSummarySchema = z.object({
  summary: z.string().optional(),
  generatedAt: z.string().optional(),
});

const validationPayloadSchema = z.object({
  validationApproach: z.string(),
  totalBudgetEstimate: z.number().finite().nonnegative().optional(),
  currency: z.string().optional(),
});

const evidenceReferenceSchema = z.array(
  z.object({
    title: z.string(),
    url: z.string().url(),
    snippet: z.string().optional(),
    relevanceScore: z.number().nullable().optional(),
  }),
);

const reviewStatusSchema = z.enum(["pending", "ready", "failed"]);

const runStatusSchema = z.enum(["queued", "running", "completed", "failed"]);

type QuestionRecord = Prisma.ResearchQuestionGetPayload<{
  include: {
    planningRuns: true;
    previews: true;
  };
}>;

function parseJsonField<T>(value: string | null | undefined, schema: ZodType<T>): T | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    const result = schema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

function selectPreferredPreview(question: NonNullable<QuestionRecord>) {
  const latestRun = question.planningRuns[0] ?? null;

  if (latestRun) {
    const runPreview = question.previews.find((preview) => preview.planningRunId === latestRun.id);
    if (runPreview) {
      return runPreview;
    }
  }

  return question.previews[0] ?? null;
}

function normalizeCriticSummary(critic: CriticSummary | null) {
  if (!critic) {
    return null;
  }

  return {
    ...critic,
    approved: critic.confidenceScore >= 70,
  };
}

function normalizeRunStatus(rawStatus: string | null | undefined) {
  if (rawStatus === "blocked") {
    return "completed" as const;
  }

  const parsed = runStatusSchema.safeParse(rawStatus);
  return parsed.success ? parsed.data : "pending";
}

function inferCurrency(...values: Array<string | null | undefined>) {
  const joined = values.filter(Boolean).join(" ");

  if (joined.includes("£")) {
    return "GBP";
  }

  if (joined.includes("€")) {
    return "EUR";
  }

  if (joined.includes("$")) {
    return "USD";
  }

  return "GBP";
}

function parseLegacyEstimate(estimate: string) {
  const currency = inferCurrency(estimate);
  const numbers = Array.from(estimate.matchAll(/(\d[\d,]*(?:\.\d+)?)/g)).map((match) =>
    Number(match[1].replaceAll(",", "")),
  );

  return {
    currency,
    lowerBound: numbers[0] ?? 0,
  };
}

function buildLegacyValidationText(
  validationSections: Array<{ title: string; detail: string }> | null,
  controlSections: Array<{ title: string; detail: string }> | null,
) {
  const sections = [
    ...(validationSections ?? []),
    ...((controlSections ?? []).map((section) => ({
      title: `Control: ${section.title}`,
      detail: section.detail,
    })) ?? []),
  ];

  if (sections.length === 0) {
    return "Legacy Operon AI preview. Validation details were not structured in the pipeline format.";
  }

  return sections.map((section) => `${section.title}: ${section.detail}`).join("\n\n");
}

function buildSources(
  planFromEvidence: ExperimentPlan | null,
  risksJson: string,
  evidenceSummaryJson: string | null,
): Source[] {
  if (planFromEvidence?.sources.length) {
    return planFromEvidence.sources;
  }

  const explicitSources = parseJsonField(risksJson, z.array(sourceSchema));
  if (explicitSources) {
    return explicitSources;
  }

  const evidenceRefs = parseJsonField(evidenceSummaryJson, evidenceReferenceSchema);
  if (evidenceRefs) {
    return evidenceRefs.map((reference) => ({
      title: reference.title,
      url: reference.url,
      type: "paper" as const,
    }));
  }

  return [];
}

function buildPlanFromPreview(
  preview: NonNullable<NonNullable<QuestionRecord>["previews"][number]>,
  questionText: string,
): ExperimentPlan | null {
  const planFromEvidence = parseJsonField(preview.evidenceSummaryJson, experimentPlanSchema);
  const controlsSummary = parseJsonField(preview.controlsJson, controlsSummarySchema);
  const validationPayload = parseJsonField(preview.validationJson, validationPayloadSchema);
  const validationSections = parseJsonField(preview.validationJson, legacyTextSectionSchema);
  const controlSections = parseJsonField(preview.controlsJson, legacyTextSectionSchema);
  const legacyProtocol = parseJsonField(preview.protocolJson, legacyTextSectionSchema);
  const legacyMaterials = parseJsonField(preview.materialsJson, legacyTextSectionSchema);
  const legacyBudget = parseJsonField(preview.budgetJson, legacyBudgetLineSchema);

  const protocol =
    parseJsonField(preview.protocolJson, z.array(protocolStepSchema)) ??
    legacyProtocol?.map((step, index) => ({
      stepNumber: index + 1,
      title: step.title || `Step ${index + 1}`,
      description: step.detail || "Legacy Operon AI protocol detail.",
      duration: "To be confirmed",
    })) ??
    planFromEvidence?.protocol ??
    [];

  const materials =
    parseJsonField(preview.materialsJson, z.array(materialSchema)) ??
    legacyMaterials?.map((item) => ({
      name: item.title || "Legacy material",
      supplier: "TBD",
      catalogNumber: "TBD",
      quantity: "TBD",
      unitCost: 0,
      totalCost: 0,
      notes: item.detail || undefined,
    })) ??
    planFromEvidence?.materials ??
    [];

  const parsedBudget =
    parseJsonField(preview.budgetJson, z.array(budgetLineSchema)) ??
    legacyBudget?.map((line) => {
      const parsedEstimate = parseLegacyEstimate(line.estimate);
      return {
        category: line.category || "legacy",
        item: line.category || "Legacy budget estimate",
        cost: parsedEstimate.lowerBound,
        currency: parsedEstimate.currency,
        notes: [line.estimate, line.note].filter(Boolean).join(" · "),
      };
    }) ??
    planFromEvidence?.budget ??
    [];

  const timeline =
    parseJsonField(preview.timelineJson, z.array(timelinePhaseSchema)) ??
    planFromEvidence?.timeline ??
    [];

  const failureModes =
    parseJsonField(preview.failureModesJson, z.array(failureModeSchema)) ??
    planFromEvidence?.failureModes ??
    [];

  const sources = buildSources(planFromEvidence, preview.risksJson, preview.evidenceSummaryJson);

  const currency =
    validationPayload?.currency ??
    planFromEvidence?.currency ??
    parsedBudget[0]?.currency ??
    inferCurrency(preview.budgetJson);

  const totalBudgetEstimate =
    validationPayload?.totalBudgetEstimate ??
    planFromEvidence?.totalBudgetEstimate ??
    parsedBudget.reduce((sum, line) => sum + line.cost, 0);

  const validationApproach =
    validationPayload?.validationApproach ??
    planFromEvidence?.validationApproach ??
    buildLegacyValidationText(validationSections, controlSections);

  if (protocol.length === 0 && materials.length === 0 && parsedBudget.length === 0 && timeline.length === 0) {
    return null;
  }

  return {
    generatedAt:
      planFromEvidence?.generatedAt ??
      controlsSummary?.generatedAt ??
      preview.createdAt.toISOString().slice(0, 10),
    hypothesis: planFromEvidence?.hypothesis ?? preview.hypothesis ?? questionText,
    title: planFromEvidence?.title ?? preview.title,
    summary:
      planFromEvidence?.summary ??
      controlsSummary?.summary ??
      preview.summary ??
      "Legacy Operon AI preview converted into the current plan view.",
    protocol,
    materials,
    budget: parsedBudget,
    totalBudgetEstimate,
    currency,
    timeline,
    validationApproach,
    failureModes,
    sources,
  };
}

function normalizeReviewStatus(
  rawStatus: string | null,
  workflowVersion: WorkflowVersion,
  critic: CriticSummary | null,
  runStatus: string | null,
): ReviewStatus {
  if (runStatus === "failed" || rawStatus === "failed") {
    return "failed";
  }

  if (workflowVersion === "pipeline_v2" && critic) {
    return "ready";
  }

  if (rawStatus === "blocked") {
    return "ready";
  }

  const parsed = reviewStatusSchema.safeParse(rawStatus);
  if (parsed.success) {
    return parsed.data;
  }

  if (workflowVersion === "legacy_preview") {
    return "pending";
  }

  return "pending";
}

export async function listExperiments(): Promise<ExperimentListItem[]> {
  const projectId = await getProjectId();
  const questions = await db.researchQuestion.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    include: {
      planningRuns: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      previews: {
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  });

  return questions.map((question) => {
    const run = question.planningRuns[0] ?? null;
    const preview = selectPreferredPreview(question);
    const qc = parseJsonField(question.literatureQcJson, literatureQcSummarySchema);
    const critic = normalizeCriticSummary(parseJsonField(preview?.criticSummaryJson, criticSummarySchema));

    return {
      id: question.id,
      hypothesis: question.question,
      createdAt: question.createdAt.toISOString(),
      status: normalizeRunStatus(run?.status) as ExperimentListItem["status"],
      stage: (run?.stage ?? null) as ExperimentListItem["stage"],
      noveltySignal: qc?.noveltySignal ?? null,
      confidenceScore: critic?.confidenceScore ?? null,
    };
  });
}

export async function getExperimentDetail(id: string): Promise<ExperimentDetailResponse | null> {
  const question = await db.researchQuestion.findUnique({
    where: { id },
    include: {
      planningRuns: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      previews: {
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  });

  if (!question) {
    return null;
  }

  const run = question.planningRuns[0] ?? null;
  const preview = selectPreferredPreview(question);
  const workflowVersion: WorkflowVersion =
    preview?.planningRunId || run?.mode === "pipeline" ? "pipeline_v2" : "legacy_preview";
  const planningBrief = parseJsonField(question.assumptionsJson, planningBriefSchema);
  const profile = parseJsonField(question.profileSummaryJson, questionProfileSchema);
  const qc = parseJsonField(question.literatureQcJson, literatureQcSummarySchema);
  const critic = normalizeCriticSummary(parseJsonField(preview?.criticSummaryJson, criticSummarySchema));
  const normalizedRunStatus = normalizeRunStatus(run?.status);
  const appliedFeedback =
    parseJsonField(preview?.appliedFeedbackJson, z.array(appliedFeedbackTraceSchema)) ?? [];
  const reviewStatus = normalizeReviewStatus(
    preview?.reviewStatus ?? null,
    workflowVersion,
    critic,
    normalizedRunStatus,
  );
  const plan = preview ? buildPlanFromPreview(preview, question.question) : null;

  return {
    id: question.id,
    hypothesis: question.question,
    createdAt: question.createdAt.toISOString(),
    status: normalizedRunStatus as ExperimentDetailResponse["status"],
    stage: (run?.stage ?? null) as ExperimentDetailResponse["stage"],
    runId: run?.id ?? null,
    workflowVersion,
    reviewStatus,
    runError: run?.error ?? null,
    qualityNote: normalizedRunStatus === "completed" ? run?.notes ?? critic?.summary ?? null : null,
    planningBrief,
    appliedFeedback,
    profile,
    qc,
    plan,
    critic,
  };
}

async function getProjectId() {
  return getDefaultProjectId();
}
