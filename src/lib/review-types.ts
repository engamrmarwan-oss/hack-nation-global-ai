// Created: 2026-04-26

import { z } from "zod";

export const REVIEW_SECTION_VALUES = [
  "protocol",
  "materials",
  "budget",
  "timeline",
  "validation",
] as const;

export type ReviewSection = (typeof REVIEW_SECTION_VALUES)[number];

export interface ScientistCorrectionDraft {
  section: ReviewSection;
  originalText: string;
  correctedText: string;
  reason: string;
  rating: number | null;
}

export interface AppliedFeedbackTrace {
  reviewId: string;
  correctionId: string;
  section: ReviewSection;
  originalText: string;
  correctedText: string;
  reason: string;
  sourceHypothesis: string;
}

export interface ReviewChatAction {
  type: "confirm_corrections";
  label: string;
}

export interface ReviewChatMessage {
  id: string;
  role: "assistant" | "user";
  content: string;
  createdAt: string;
  actions?: ReviewChatAction[];
}

export interface ReviewChatSessionState {
  version: 1;
  experimentId: string;
  previewId: string;
  planTitle: string;
  hypothesis: string;
  messages: ReviewChatMessage[];
  pendingCorrections: ScientistCorrectionDraft[];
  readyToConfirm: boolean;
  confirmedAt: string | null;
}

export const scientistCorrectionDraftSchema = z.object({
  section: z.enum(REVIEW_SECTION_VALUES),
  originalText: z.string().min(1).max(320),
  correctedText: z.string().min(1).max(320),
  reason: z.string().min(1).max(220),
  rating: z.number().int().min(1).max(5).nullable(),
});

export const appliedFeedbackTraceSchema = scientistCorrectionDraftSchema.extend({
  reviewId: z.string().min(1),
  correctionId: z.string().min(1),
  sourceHypothesis: z.string().min(1),
});

export const reviewChatActionSchema = z.object({
  type: z.literal("confirm_corrections"),
  label: z.string().min(1).max(80),
});

export const reviewChatMessageSchema = z.object({
  id: z.string().min(1),
  role: z.enum(["assistant", "user"]),
  content: z.string().min(1),
  createdAt: z.string().min(1),
  actions: z.array(reviewChatActionSchema).max(2).optional(),
});

export const reviewChatSessionStateSchema = z.object({
  version: z.literal(1),
  experimentId: z.string().min(1),
  previewId: z.string().min(1),
  planTitle: z.string().min(1),
  hypothesis: z.string().min(1),
  messages: z.array(reviewChatMessageSchema),
  pendingCorrections: z.array(scientistCorrectionDraftSchema).max(4),
  readyToConfirm: z.boolean(),
  confirmedAt: z.string().nullable(),
});

export const reviewTurnResultSchema = z.object({
  assistantReply: z.string().min(1).max(700),
  extractedCorrections: z.array(scientistCorrectionDraftSchema).max(4),
  readyToConfirm: z.boolean(),
});

export type ReviewTurnResult = z.infer<typeof reviewTurnResultSchema>;

export function createReviewMessageId(prefix: "assistant" | "user") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createReviewAssistantMessage(
  content: string,
  options?: {
    actions?: ReviewChatAction[];
  },
): ReviewChatMessage {
  return {
    id: createReviewMessageId("assistant"),
    role: "assistant",
    content,
    createdAt: new Date().toISOString(),
    actions: options?.actions,
  };
}

export function createReviewUserMessage(content: string): ReviewChatMessage {
  return {
    id: createReviewMessageId("user"),
    role: "user",
    content,
    createdAt: new Date().toISOString(),
  };
}

export function createInitialReviewSessionState({
  experimentId,
  previewId,
  planTitle,
  hypothesis,
}: {
  experimentId: string;
  previewId: string;
  planTitle: string;
  hypothesis: string;
}): ReviewChatSessionState {
  return {
    version: 1,
    experimentId,
    previewId,
    planTitle,
    hypothesis,
    messages: [
      createReviewAssistantMessage(
        "Tell me what you would correct in this plan. You can write naturally. If you know them, include the section, the original text, the corrected version, and why it should change.",
      ),
    ],
    pendingCorrections: [],
    readyToConfirm: false,
    confirmedAt: null,
  };
}

export function buildReviewConfirmAction(): ReviewChatAction[] {
  return [
    {
      type: "confirm_corrections",
      label: "Save corrections",
    },
  ];
}
