import { z } from "zod";

export type PlanningRunStage =
  | "question_profile"
  | "literature_qc"
  | "evidence_retrieval"
  | "draft_generation"
  | "critic_validation"
  | "review_ready"
  | "applied";

export type PlanningRunStatus = "queued" | "running" | "completed" | "failed";

export type NoveltySignal = "not_found" | "similar_exists" | "exact_match";

export type ReviewStatus = "pending" | "ready" | "failed";

export type WorkflowVersion = "pipeline_v2" | "legacy_preview";

export type QuestionProfile = {
  experimentClass: string;
  primaryObjective: string;
  primaryEndpoint: string;
  intervention: string;
  modelSystem: string;
  rationale: string;
  keyTerms: string[];
  riskFlags: string[];
};

export type LiteratureQcReference = {
  title: string;
  url: string;
  snippet: string;
  relevanceScore: number | null;
};

export type LiteratureQcSummary = {
  noveltySignal: NoveltySignal;
  searchQuery: string;
  referenceCount: number;
  rationale: string;
  references: LiteratureQcReference[];
};

export type CriticSummary = {
  confidenceScore: number;
  approved: boolean;
  warnings: string[];
  blockers: string[];
  summary: string;
};

export type HypothesisHealthScore = "A" | "B" | "C" | "D";

export type AssumptionAuditStatus = "explicit" | "ambiguous" | "missing";

export type AssumptionAuditField = {
  status: AssumptionAuditStatus;
  detail: string;
};

export type ThresholdAssessmentVerdict =
  | "realistic"
  | "aggressive"
  | "likely_unrealistic"
  | "not_enough_evidence";

export type HypothesisHealthReport = {
  healthScore: HypothesisHealthScore;
  summary: string;
  hypothesisText: string;
  assumptionAudit: {
    dose: AssumptionAuditField;
    route: AssumptionAuditField;
    sampleSize: AssumptionAuditField;
    assayTiming: AssumptionAuditField;
    controlChoice: AssumptionAuditField;
    speciesOrStrain: AssumptionAuditField;
    endpointDefinition: AssumptionAuditField;
  };
  confoundRisks: string[];
  controlGaps: string[];
  thresholdAssessment: {
    verdict: ThresholdAssessmentVerdict;
    rationale: string;
  };
  mechanisticFlags: string[];
};

export const questionProfileSchema = z.object({
  experimentClass: z.string().min(1),
  primaryObjective: z.string().min(1),
  primaryEndpoint: z.string().min(1),
  intervention: z.string().min(1),
  modelSystem: z.string().min(1),
  rationale: z.string().min(1),
  keyTerms: z.array(z.string().min(1)).min(1).max(8),
  riskFlags: z.array(z.string().min(1)),
});

export const orchestratorOutputSchema = questionProfileSchema.extend({
  isValid: z.boolean(),
  validationWarnings: z.array(z.string()),
});

export const literatureQcReferenceSchema = z.object({
  title: z.string().min(1),
  url: z.string().url(),
  snippet: z.string(),
  relevanceScore: z.number().nullable(),
});

export const literatureQcSummarySchema = z.object({
  noveltySignal: z.enum(["not_found", "similar_exists", "exact_match"]),
  searchQuery: z.string().min(1),
  referenceCount: z.number().int().nonnegative(),
  rationale: z.string().min(1),
  references: z.array(literatureQcReferenceSchema),
});

export const criticSummarySchema = z.object({
  confidenceScore: z.number().min(0).max(100),
  approved: z.boolean(),
  warnings: z.array(z.string()),
  blockers: z.array(z.string()),
  summary: z.string().min(1),
});

export const assumptionAuditFieldSchema = z.object({
  status: z.enum(["explicit", "ambiguous", "missing"]),
  detail: z.string().min(1).max(240),
});

export const thresholdAssessmentSchema = z.object({
  verdict: z.enum(["realistic", "aggressive", "likely_unrealistic", "not_enough_evidence"]),
  rationale: z.string().min(1).max(320),
});

export const hypothesisHealthReportSchema = z.object({
  healthScore: z.enum(["A", "B", "C", "D"]),
  summary: z.string().min(1).max(320),
  hypothesisText: z.string().min(1),
  assumptionAudit: z.object({
    dose: assumptionAuditFieldSchema,
    route: assumptionAuditFieldSchema,
    sampleSize: assumptionAuditFieldSchema,
    assayTiming: assumptionAuditFieldSchema,
    controlChoice: assumptionAuditFieldSchema,
    speciesOrStrain: assumptionAuditFieldSchema,
    endpointDefinition: assumptionAuditFieldSchema,
  }),
  confoundRisks: z.array(z.string().min(1).max(220)).min(1).max(6),
  controlGaps: z.array(z.string().min(1).max(220)).min(1).max(6),
  thresholdAssessment: thresholdAssessmentSchema,
  mechanisticFlags: z.array(z.string().min(1).max(220)).min(1).max(6),
});

export type StageStatus = "queued" | "running" | "completed" | "failed";

export type StageRecord<T> = {
  label: string;
  status: StageStatus;
  startedAt: string | null;
  finishedAt: string | null;
  summary: string | null;
  error: string | null;
  output: T | null;
};

export type PlanningRunStageData = {
  questionProfile: StageRecord<QuestionProfile>;
  literatureQc: StageRecord<LiteratureQcSummary>;
  evidenceRetrieval: StageRecord<{
    sourceCount: number;
    answer: string | null;
  }>;
  draftGeneration: StageRecord<{
    previewId: string;
    previewTitle: string;
  }>;
  criticValidation: StageRecord<CriticSummary>;
  reviewReady: StageRecord<{
    previewId: string;
    qualityChecked: boolean;
  }>;
  applied: StageRecord<{
    previewId: string;
    planId: string;
  }>;
};

type StageKey = keyof PlanningRunStageData;

const stageLabels: Record<StageKey, string> = {
  questionProfile: "Question profile",
  literatureQc: "Literature QC",
  evidenceRetrieval: "Evidence retrieval",
  draftGeneration: "Draft generation",
  criticValidation: "Critic validation",
  reviewReady: "Review ready",
  applied: "Applied",
};

function createStageRecord<T>(label: string): StageRecord<T> {
  return {
    label,
    status: "queued",
    startedAt: null,
    finishedAt: null,
    summary: null,
    error: null,
    output: null,
  };
}

export function createInitialRunStageData(): PlanningRunStageData {
  return {
    questionProfile: createStageRecord(stageLabels.questionProfile),
    literatureQc: createStageRecord(stageLabels.literatureQc),
    evidenceRetrieval: createStageRecord(stageLabels.evidenceRetrieval),
    draftGeneration: createStageRecord(stageLabels.draftGeneration),
    criticValidation: createStageRecord(stageLabels.criticValidation),
    reviewReady: createStageRecord(stageLabels.reviewReady),
    applied: createStageRecord(stageLabels.applied),
  };
}

export function parseStageDataJson(stageDataJson: string | null | undefined): PlanningRunStageData {
  if (!stageDataJson) {
    return createInitialRunStageData();
  }

  try {
    const parsed = JSON.parse(stageDataJson) as Partial<PlanningRunStageData>;
    return {
      ...createInitialRunStageData(),
      ...parsed,
    };
  } catch {
    return createInitialRunStageData();
  }
}

export function serializeStageData(stageData: PlanningRunStageData): string {
  return JSON.stringify(stageData);
}

export function markStageRunning<K extends StageKey>(
  stageData: PlanningRunStageData,
  key: K,
  startedAt: string,
  summary: string | null = null,
): PlanningRunStageData {
  const next = structuredClone(stageData);
  next[key] = {
    ...next[key],
    status: "running",
    startedAt,
    finishedAt: null,
    summary,
    error: null,
  };
  return next;
}

export function markStageCompleted<K extends StageKey>(
  stageData: PlanningRunStageData,
  key: K,
  finishedAt: string,
  output: PlanningRunStageData[K]["output"],
  summary: string | null = null,
): PlanningRunStageData {
  const next = structuredClone(stageData);
  next[key] = {
    ...next[key],
    status: "completed",
    finishedAt,
    summary,
    error: null,
    output,
  };
  return next;
}

export function markStageFailed<K extends StageKey>(
  stageData: PlanningRunStageData,
  key: K,
  finishedAt: string,
  error: string,
): PlanningRunStageData {
  const next = structuredClone(stageData);
  next[key] = {
    ...next[key],
    status: "failed",
    finishedAt,
    error,
  };
  return next;
}

export function stageKeyFromStage(stage: PlanningRunStage): StageKey {
  switch (stage) {
    case "question_profile":
      return "questionProfile";
    case "literature_qc":
      return "literatureQc";
    case "evidence_retrieval":
      return "evidenceRetrieval";
    case "draft_generation":
      return "draftGeneration";
    case "critic_validation":
      return "criticValidation";
    case "review_ready":
      return "reviewReady";
    case "applied":
      return "applied";
  }
}

export function getNoveltyExactMatchThreshold(keyTermCount: number) {
  return Math.max(3, Math.ceil(keyTermCount * 0.4));
}

export const workflowStageOrder: Array<{
  stage: PlanningRunStage;
  key: StageKey;
}> = [
  { stage: "question_profile", key: "questionProfile" },
  { stage: "literature_qc", key: "literatureQc" },
  { stage: "evidence_retrieval", key: "evidenceRetrieval" },
  { stage: "draft_generation", key: "draftGeneration" },
  { stage: "critic_validation", key: "criticValidation" },
  { stage: "review_ready", key: "reviewReady" },
  { stage: "applied", key: "applied" },
];
