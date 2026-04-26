// Created: 2026-04-26

import { db } from "@/lib/db";
import { getExperimentDetail } from "@/lib/experiment-data";
import { runReviewChatTurn } from "./agents/review-chat";
import {
  buildReviewConfirmAction,
  createInitialReviewSessionState,
  createReviewAssistantMessage,
  createReviewUserMessage,
  reviewChatSessionStateSchema,
  type ReviewChatSessionState,
} from "./review-types";

function parseReviewSessionState(raw: string | null | undefined) {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    const result = reviewChatSessionStateSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

async function loadReviewContext(experimentId: string) {
  const detail = await getExperimentDetail(experimentId);
  if (!detail || !detail.plan) {
    throw new Error("Plan not available for scientist review yet.");
  }

  const question = await db.researchQuestion.findUnique({
    where: { id: experimentId },
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
    throw new Error("Experiment not found.");
  }

  const latestRun = question.planningRuns[0] ?? null;
  const preview =
    (latestRun
      ? question.previews.find((candidate) => candidate.planningRunId === latestRun.id)
      : null) ??
    question.previews[0] ??
    null;

  if (!preview) {
    throw new Error("No generated preview is available for this experiment yet.");
  }

  return {
    detail,
    previewId: preview.id,
    projectId: preview.projectId,
  };
}

async function saveReviewSessionState(sessionId: string, state: ReviewChatSessionState) {
  await db.planningRun.update({
    where: { id: sessionId },
    data: {
      stageDataJson: JSON.stringify(state),
      notes:
        state.pendingCorrections.length > 0
          ? `${state.pendingCorrections.length} correction(s) pending confirmation.`
          : null,
    },
  });
}

export async function createReviewSession(experimentId: string) {
  const { detail, previewId, projectId } = await loadReviewContext(experimentId);

  const initialState = createInitialReviewSessionState({
    experimentId,
    previewId,
    planTitle: detail.plan!.title,
    hypothesis: detail.hypothesis,
  });

  const session = await db.planningRun.create({
    data: {
      mode: "review_chat",
      status: "running",
      stage: "review",
      stageDataJson: JSON.stringify(initialState),
      startedAt: new Date(),
      projectId,
      questionId: experimentId,
    },
  });

  return {
    id: session.id,
    state: initialState,
  };
}

export async function getReviewSession(sessionId: string) {
  const session = await db.planningRun.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      mode: true,
      status: true,
      stageDataJson: true,
    },
  });

  if (!session || session.mode !== "review_chat") {
    return null;
  }

  const state = parseReviewSessionState(session.stageDataJson);
  if (!state) {
    return null;
  }

  return {
    id: session.id,
    status: session.status,
    state,
  };
}

export async function applyReviewMessage({
  sessionId,
  message,
}: {
  sessionId: string;
  message?: string;
}) {
  const session = await getReviewSession(sessionId);
  if (!session) {
    throw new Error("Review session not found.");
  }

  if (session.state.confirmedAt) {
    throw new Error("This review session has already been saved.");
  }

  const trimmed = message?.trim();
  if (!trimmed) {
    throw new Error("A message is required.");
  }

  const context = await loadReviewContext(session.state.experimentId);
  const userMessage = createReviewUserMessage(trimmed);
  const transcript = [...session.state.messages, userMessage];
  const result = await runReviewChatTurn({
    plan: context.detail.plan!,
    planningBrief: context.detail.planningBrief,
    profile: context.detail.profile,
    messages: transcript,
    latestUserMessage: trimmed,
  });

  const readyToConfirm = result.readyToConfirm && result.extractedCorrections.length > 0;
  const nextState: ReviewChatSessionState = {
    ...session.state,
    messages: [
      ...transcript,
      createReviewAssistantMessage(result.assistantReply, {
        actions: readyToConfirm ? buildReviewConfirmAction() : undefined,
      }),
    ],
    pendingCorrections: readyToConfirm ? result.extractedCorrections : [],
    readyToConfirm,
  };

  await saveReviewSessionState(sessionId, nextState);
  return nextState;
}

export async function confirmReviewSession(sessionId: string) {
  const session = await getReviewSession(sessionId);
  if (!session) {
    throw new Error("Review session not found.");
  }

  if (!session.state.readyToConfirm || session.state.pendingCorrections.length === 0) {
    throw new Error("Operon AI still needs clearer corrections before it can save this review.");
  }

  if (session.state.confirmedAt) {
    throw new Error("This review session has already been saved.");
  }

  const context = await loadReviewContext(session.state.experimentId);
  const correctionCount = session.state.pendingCorrections.length;
  const review = await db.scientistReview.create({
    data: {
      projectId: context.projectId,
      questionId: session.state.experimentId,
      previewId: session.state.previewId,
      domainHint: context.detail.planningBrief?.domainHint || null,
      experimentClass: context.detail.profile?.experimentClass ?? "general_experiment",
      interventionText:
        context.detail.planningBrief?.intervention ||
        context.detail.profile?.intervention ||
        null,
      endpointText:
        context.detail.planningBrief?.primaryEndpoint ||
        context.detail.profile?.primaryEndpoint ||
        null,
      corrections: {
        create: session.state.pendingCorrections.map((correction) => ({
          section: correction.section,
          originalText: correction.originalText,
          correctedText: correction.correctedText,
          reason: correction.reason,
          rating: correction.rating,
        })),
      },
    },
  });

  const nextState: ReviewChatSessionState = {
    ...session.state,
    readyToConfirm: false,
    confirmedAt: new Date().toISOString(),
    pendingCorrections: [],
    messages: [
      ...session.state.messages,
      createReviewAssistantMessage(
        `Saved ${correctionCount} correction${correctionCount === 1 ? "" : "s"}. Future similar plans will reuse this expert feedback automatically.`,
      ),
    ],
  };

  await db.planningRun.update({
    where: { id: sessionId },
    data: {
      status: "completed",
      stage: "confirmed",
      finishedAt: new Date(),
      stageDataJson: JSON.stringify(nextState),
      notes: `Saved ${correctionCount} scientist correction(s) as review ${review.id}.`,
    },
  });

  return {
    reviewId: review.id,
    correctionCount,
    state: nextState,
  };
}
