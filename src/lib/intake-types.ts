// Created: 2026-04-26

import { z } from "zod";

export const DOMAIN_HINT_VALUES = [
  "in_vivo_biology",
  "cell_biology",
  "diagnostics",
  "climate_biotech",
  "general_experiment",
] as const;

export type DomainHint = (typeof DOMAIN_HINT_VALUES)[number];

export type PlanningBriefCoreField =
  | "intervention"
  | "modelSystem"
  | "primaryEndpoint"
  | "comparator";

export interface PlanningBrief {
  intervention: string;
  modelSystem: string;
  primaryEndpoint: string;
  comparator: string;
  threshold: string;
  mechanism: string;
  domainHint: DomainHint | "";
  claimConstraints: string[];
  confirmedAssumptions: string[];
}

export interface IntakeQuickReply {
  label: string;
  message: string;
}

export type IntakeActionType =
  | "quick_reply"
  | "accept_assumptions"
  | "skip_assumptions"
  | "confirm_hypothesis";

export interface IntakeAction {
  type: IntakeActionType;
  label: string;
  message?: string;
}

export interface IntakeMessage {
  id: string;
  role: "assistant" | "user";
  content: string;
  createdAt: string;
  quickReplies?: IntakeQuickReply[];
  actions?: IntakeAction[];
}

export interface IntakeSessionState {
  version: 1;
  planningBrief: PlanningBrief;
  messages: IntakeMessage[];
  missingCoreFields: PlanningBriefCoreField[];
  pendingAssumptions: string[];
  synthesizedHypothesis: string | null;
  readyToSynthesize: boolean;
  confirmedAt: string | null;
}

export const planningBriefSchema = z.object({
  intervention: z.string(),
  modelSystem: z.string(),
  primaryEndpoint: z.string(),
  comparator: z.string(),
  threshold: z.string(),
  mechanism: z.string(),
  domainHint: z.union([z.enum(DOMAIN_HINT_VALUES), z.literal("")]),
  claimConstraints: z.array(z.string().min(1).max(200)).max(8),
  confirmedAssumptions: z.array(z.string().min(1).max(200)).max(8),
});

export const intakeQuickReplySchema = z.object({
  label: z.string().min(1).max(80),
  message: z.string().min(1).max(200),
});

export const intakeActionSchema = z.object({
  type: z.enum(["quick_reply", "accept_assumptions", "skip_assumptions", "confirm_hypothesis"]),
  label: z.string().min(1).max(80),
  message: z.string().min(1).max(200).optional(),
});

export const intakeMessageSchema = z.object({
  id: z.string().min(1),
  role: z.enum(["assistant", "user"]),
  content: z.string().min(1),
  createdAt: z.string().min(1),
  quickReplies: z.array(intakeQuickReplySchema).max(4).optional(),
  actions: z.array(intakeActionSchema).max(4).optional(),
});

export const intakeSessionStateSchema = z.object({
  version: z.literal(1),
  planningBrief: planningBriefSchema,
  messages: z.array(intakeMessageSchema),
  missingCoreFields: z.array(z.enum(["intervention", "modelSystem", "primaryEndpoint", "comparator"])),
  pendingAssumptions: z.array(z.string().min(1).max(200)).max(8),
  synthesizedHypothesis: z.string().nullable(),
  readyToSynthesize: z.boolean(),
  confirmedAt: z.string().nullable(),
});

export const intakeTurnUpdateSchema = z.object({
  intervention: z.string().max(220).nullable(),
  modelSystem: z.string().max(220).nullable(),
  primaryEndpoint: z.string().max(220).nullable(),
  comparator: z.string().max(220).nullable(),
  threshold: z.string().max(180).nullable(),
  mechanism: z.string().max(220).nullable(),
  domainHint: z.union([z.enum(DOMAIN_HINT_VALUES), z.literal(""), z.null()]),
  claimConstraints: z.array(z.string().min(1).max(200)).max(6),
});

export const intakeTurnResultSchema = z.object({
  fieldUpdates: intakeTurnUpdateSchema,
  assistantReply: z.string().min(1).max(700),
  quickReplies: z.array(intakeQuickReplySchema).max(4),
  suggestedAssumptions: z.array(z.string().min(1).max(200)).max(4),
  contradictionNote: z.string().max(240).nullable(),
});

export type IntakeTurnResult = z.infer<typeof intakeTurnResultSchema>;

export const EMPTY_PLANNING_BRIEF: PlanningBrief = {
  intervention: "",
  modelSystem: "",
  primaryEndpoint: "",
  comparator: "",
  threshold: "",
  mechanism: "",
  domainHint: "",
  claimConstraints: [],
  confirmedAssumptions: [],
};

function uniqueStrings(values: string[]) {
  return Array.from(
    new Set(
      values
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  );
}

export function getMissingCoreFields(brief: PlanningBrief): PlanningBriefCoreField[] {
  const missing: PlanningBriefCoreField[] = [];

  if (!brief.intervention.trim()) missing.push("intervention");
  if (!brief.modelSystem.trim()) missing.push("modelSystem");
  if (!brief.primaryEndpoint.trim()) missing.push("primaryEndpoint");
  if (!brief.comparator.trim()) missing.push("comparator");

  return missing;
}

export function isPlanningBriefSufficient(brief: PlanningBrief) {
  return getMissingCoreFields(brief).length === 0;
}

export function mergePlanningBrief(
  current: PlanningBrief,
  update: z.infer<typeof intakeTurnUpdateSchema>,
) {
  return {
    intervention: update.intervention ?? current.intervention,
    modelSystem: update.modelSystem ?? current.modelSystem,
    primaryEndpoint: update.primaryEndpoint ?? current.primaryEndpoint,
    comparator: update.comparator ?? current.comparator,
    threshold: update.threshold ?? current.threshold,
    mechanism: update.mechanism ?? current.mechanism,
    domainHint: update.domainHint ?? current.domainHint,
    claimConstraints: uniqueStrings([...current.claimConstraints, ...update.claimConstraints]),
    confirmedAssumptions: current.confirmedAssumptions,
  } satisfies PlanningBrief;
}

export function appendConfirmedAssumptions(brief: PlanningBrief, assumptions: string[]) {
  return {
    ...brief,
    confirmedAssumptions: uniqueStrings([...brief.confirmedAssumptions, ...assumptions]),
  } satisfies PlanningBrief;
}

export function synthesizeHypothesisFromBrief(brief: PlanningBrief) {
  const segments = [
    `${brief.intervention.trim()} in ${brief.modelSystem.trim()} will ${brief.primaryEndpoint.trim()}`,
    brief.threshold.trim() ? `with a success threshold of ${brief.threshold.trim()}` : "",
    brief.comparator.trim() ? `compared to ${brief.comparator.trim()}` : "",
    brief.claimConstraints.length > 0
      ? `under these stated conditions: ${brief.claimConstraints.join("; ")}`
      : "",
    brief.mechanism.trim() ? `because ${brief.mechanism.trim()}` : "",
  ].filter(Boolean);

  return `${segments.join(", ")}.`.replace(/\s+/g, " ").trim();
}

export function createMessageId(prefix: "assistant" | "user") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createAssistantMessage(
  content: string,
  options?: {
    quickReplies?: IntakeQuickReply[];
    actions?: IntakeAction[];
  },
): IntakeMessage {
  return {
    id: createMessageId("assistant"),
    role: "assistant",
    content,
    createdAt: new Date().toISOString(),
    quickReplies: options?.quickReplies,
    actions: options?.actions,
  };
}

export function createUserMessage(content: string): IntakeMessage {
  return {
    id: createMessageId("user"),
    role: "user",
    content,
    createdAt: new Date().toISOString(),
  };
}

export function createInitialIntakeSessionState(): IntakeSessionState {
  return {
    version: 1,
    planningBrief: EMPTY_PLANNING_BRIEF,
    messages: [
      createAssistantMessage(
        "Tell me the experiment idea in your own words. Include the intervention, system, endpoint, and comparator if you already know them.",
        {
          quickReplies: [
            {
              label: "In vivo mouse study",
              message: "This is an in vivo biology study in mice.",
            },
            {
              label: "Cell biology",
              message: "This is a cell biology experiment.",
            },
            {
              label: "Diagnostics assay",
              message: "This is a diagnostics or biosensor experiment.",
            },
          ],
        },
      ),
    ],
    missingCoreFields: ["intervention", "modelSystem", "primaryEndpoint", "comparator"],
    pendingAssumptions: [],
    synthesizedHypothesis: null,
    readyToSynthesize: false,
    confirmedAt: null,
  };
}

export function buildAssumptionActions(): IntakeAction[] {
  return [
    { type: "accept_assumptions", label: "Accept suggestions" },
    { type: "skip_assumptions", label: "Skip suggestions" },
  ];
}

export function buildReadyActions(): IntakeAction[] {
  return [{ type: "confirm_hypothesis", label: "Run Analysis" }];
}
