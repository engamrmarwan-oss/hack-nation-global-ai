import type {
  QuestionProfile,
  LiteratureQcSummary,
  CriticSummary,
} from "./workflow-types";
import type {
  NoveltySignal,
  PlanningRunStage,
  PlanningRunStatus,
  ReviewStatus,
  WorkflowVersion,
} from "./workflow-types";
import type { PlanningBrief } from "./intake-types";
import type { AppliedFeedbackTrace } from "./review-types";
import { z } from "zod";

export interface ProtocolStep {
  stepNumber: number;
  title: string;
  description: string;
  duration: string;
  sourceProtocol?: string;
  sourceUrl?: string;
  criticalNote?: string;
}

export interface Material {
  name: string;
  supplier: string;
  catalogNumber: string;
  quantity: string;
  unitCost: number;
  totalCost: number;
  notes?: string;
}

export interface BudgetLine {
  category: string;
  item: string;
  cost: number;
  currency: string;
  notes?: string;
}

export interface TimelinePhase {
  phase: number;
  title: string;
  duration: string;
  dependencies: string[];
  milestones: string[];
}

export interface Source {
  title: string;
  url: string;
  type: "protocol" | "paper" | "supplier";
}

export interface FailureMode {
  title: string;
  whyItFails: string;
  signalToWatch: string;
  mitigation: string;
  sourceTitle: string;
  sourceUrl: string;
}

export interface ExperimentPlan {
  generatedAt: string;
  hypothesis: string;
  title: string;
  summary: string;
  protocol: ProtocolStep[];
  materials: Material[];
  budget: BudgetLine[];
  totalBudgetEstimate: number;
  currency: string;
  timeline: TimelinePhase[];
  validationApproach: string;
  failureModes: FailureMode[];
  sources: Source[];
}

export interface ExperimentListItem {
  id: string;
  hypothesis: string;
  createdAt: string;
  status: PlanningRunStatus | "pending";
  stage: PlanningRunStage | "completed" | null;
  noveltySignal: NoveltySignal | null;
  confidenceScore: number | null;
}

export interface ExperimentDetailResponse {
  id: string;
  hypothesis: string;
  createdAt: string;
  status: PlanningRunStatus | "pending";
  stage: PlanningRunStage | "completed" | null;
  runId: string | null;
  workflowVersion: WorkflowVersion;
  reviewStatus: ReviewStatus;
  runError: string | null;
  qualityNote: string | null;
  planningBrief: PlanningBrief | null;
  appliedFeedback: AppliedFeedbackTrace[];
  profile: QuestionProfile | null;
  qc: LiteratureQcSummary | null;
  plan: ExperimentPlan | null;
  critic: CriticSummary | null;
}

export const protocolStepSchema = z.object({
  stepNumber: z.number().int().positive(),
  title: z.string().min(1),
  description: z.string().min(1),
  duration: z.string().min(1),
  sourceProtocol: z.string().min(1).optional(),
  sourceUrl: z.string().url().optional(),
  criticalNote: z.string().min(1).optional(),
});

export const materialSchema = z.object({
  name: z.string().min(1),
  supplier: z.string().min(1),
  catalogNumber: z.string().min(1),
  quantity: z.string().min(1),
  unitCost: z.number().finite().nonnegative(),
  totalCost: z.number().finite().nonnegative(),
  notes: z.string().optional(),
});

export const budgetLineSchema = z.object({
  category: z.string().min(1),
  item: z.string().min(1),
  cost: z.number().finite().nonnegative(),
  currency: z.string().min(1),
  notes: z.string().optional(),
});

export const timelinePhaseSchema = z.object({
  phase: z.number().int().positive(),
  title: z.string().min(1),
  duration: z.string().min(1),
  dependencies: z.array(z.string()),
  milestones: z.array(z.string()),
});

export const sourceSchema = z.object({
  title: z.string().min(1),
  url: z.string().url(),
  type: z.enum(["protocol", "paper", "supplier"]),
});

export const failureModeSchema = z.object({
  title: z.string().min(1),
  whyItFails: z.string().min(1),
  signalToWatch: z.string().min(1),
  mitigation: z.string().min(1),
  sourceTitle: z.string().min(1),
  sourceUrl: z.string().url(),
});

export const experimentPlanSchema = z.object({
  generatedAt: z.string().min(1),
  hypothesis: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  protocol: z.array(protocolStepSchema).min(1),
  materials: z.array(materialSchema).min(1),
  budget: z.array(budgetLineSchema).min(1),
  totalBudgetEstimate: z.number().finite().nonnegative(),
  currency: z.string().min(1),
  timeline: z.array(timelinePhaseSchema),
  validationApproach: z.string().min(1),
  failureModes: z.array(failureModeSchema).default([]),
  sources: z.array(sourceSchema),
});

export type PipelineEvent =
  | { stage: "orchestrator"; status: "running" | "completed" | "failed"; data?: QuestionProfile; error?: string }
  | { stage: "literature_qc"; status: "running" | "completed" | "failed"; data?: LiteratureQcSummary; error?: string }
  | { stage: "planner"; status: "running" | "completed" | "failed"; data?: ExperimentPlan; error?: string }
  | { stage: "critic"; status: "running" | "completed" | "failed"; data?: CriticSummary; error?: string }
  | { stage: "done"; status: "completed" }
  | { stage: "error"; status: "failed"; error: string };
