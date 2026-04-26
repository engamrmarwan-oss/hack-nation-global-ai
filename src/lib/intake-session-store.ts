// Created: 2026-04-26

import { db } from "@/lib/db";
import { getDefaultProjectId } from "@/lib/default-project";
import {
  buildAssumptionActions,
  buildReadyActions,
  createAssistantMessage,
  createInitialIntakeSessionState,
  createUserMessage,
  getMissingCoreFields,
  intakeSessionStateSchema,
  isPlanningBriefSufficient,
  mergePlanningBrief,
  synthesizeHypothesisFromBrief,
  type IntakeSessionState,
  type IntakeTurnResult,
} from "./intake-types";
import { runIntakeChatTurn } from "./agents/intake-chat";

function parseIntakeState(raw: string | null | undefined) {
  if (!raw) {
    return createInitialIntakeSessionState();
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    const result = intakeSessionStateSchema.safeParse(parsed);
    return result.success ? result.data : createInitialIntakeSessionState();
  } catch {
    return createInitialIntakeSessionState();
  }
}

function buildPreviewMessage(state: IntakeSessionState) {
  return createAssistantMessage(
    [
      "I have enough to build a planning-ready brief.",
      `Hypothesis preview: ${state.synthesizedHypothesis}`,
      state.planningBrief.confirmedAssumptions.length > 0
        ? `Confirmed assumptions: ${state.planningBrief.confirmedAssumptions.join("; ")}`
        : "No optional assumptions were locked in.",
    ].join("\n\n"),
    {
      actions: buildReadyActions(),
    },
  );
}

function withDerivedState(state: IntakeSessionState) {
  const missingCoreFields = getMissingCoreFields(state.planningBrief);
  const readyToSynthesize =
    missingCoreFields.length === 0 &&
    state.pendingAssumptions.length === 0;
  const synthesizedHypothesis =
    readyToSynthesize && isPlanningBriefSufficient(state.planningBrief)
      ? synthesizeHypothesisFromBrief(state.planningBrief)
      : null;

  return {
    ...state,
    missingCoreFields,
    readyToSynthesize,
    synthesizedHypothesis,
  } satisfies IntakeSessionState;
}

function buildAssumptionPrompt(result: IntakeTurnResult) {
  return createAssistantMessage(result.assistantReply, {
    actions: buildAssumptionActions(),
  });
}

async function saveSessionState(sessionId: string, state: IntakeSessionState) {
  await db.planningRun.update({
    where: { id: sessionId },
    data: {
      stageDataJson: JSON.stringify(state),
      notes: state.synthesizedHypothesis ?? null,
    },
  });
}

export async function createIntakeSession() {
  const projectId = await getDefaultProjectId();
  const initialState = createInitialIntakeSessionState();

  const session = await db.planningRun.create({
    data: {
      mode: "intake",
      status: "running",
      stage: "intake",
      stageDataJson: JSON.stringify(initialState),
      startedAt: new Date(),
      projectId,
    },
  });

  return {
    id: session.id,
    state: initialState,
  };
}

export async function getIntakeSession(sessionId: string) {
  const session = await db.planningRun.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      mode: true,
      status: true,
      stageDataJson: true,
    },
  });

  if (!session || session.mode !== "intake") {
    return null;
  }

  return {
    id: session.id,
    status: session.status,
    state: parseIntakeState(session.stageDataJson),
  };
}

export async function applyIntakeMessage({
  sessionId,
  message,
  action,
}: {
  sessionId: string;
  message?: string;
  action?: "accept_assumptions" | "skip_assumptions";
}) {
  const session = await getIntakeSession(sessionId);
  if (!session) {
    throw new Error("Intake session not found.");
  }

  let nextState = { ...session.state };

  if (action) {
    if (nextState.pendingAssumptions.length === 0) {
      throw new Error("There are no pending assumptions to confirm.");
    }

    if (action === "accept_assumptions") {
      nextState = withDerivedState({
        ...nextState,
        planningBrief: {
          ...nextState.planningBrief,
          confirmedAssumptions: Array.from(
            new Set([
              ...nextState.planningBrief.confirmedAssumptions,
              ...nextState.pendingAssumptions,
            ]),
          ),
        },
        pendingAssumptions: [],
        messages: [
          ...nextState.messages,
          createUserMessage("Accept the suggested planning assumptions."),
        ],
      });
    } else {
      nextState = withDerivedState({
        ...nextState,
        pendingAssumptions: [],
        messages: [
          ...nextState.messages,
          createUserMessage("Continue without those optional assumptions."),
        ],
      });
    }

    nextState = {
      ...nextState,
      messages: [...nextState.messages, buildPreviewMessage(nextState)],
    };

    await saveSessionState(sessionId, nextState);
    return nextState;
  }

  const trimmed = message?.trim();
  if (!trimmed) {
    throw new Error("A message is required.");
  }

  const userMessage = createUserMessage(trimmed);
  const transcript = [...nextState.messages, userMessage];
  const result = await runIntakeChatTurn({
    planningBrief: nextState.planningBrief,
    missingCoreFields: nextState.missingCoreFields,
    messages: transcript,
    latestUserMessage: trimmed,
  });

  nextState = withDerivedState({
    ...nextState,
    planningBrief: mergePlanningBrief(nextState.planningBrief, result.fieldUpdates),
    messages: transcript,
    pendingAssumptions: [],
  });

  const hasCoreCoverage = nextState.missingCoreFields.length === 0;
  const uniqueSuggestedAssumptions = Array.from(
    new Set(
      result.suggestedAssumptions.filter(
        (assumption) => !nextState.planningBrief.confirmedAssumptions.includes(assumption),
      ),
    ),
  );

  if (hasCoreCoverage && uniqueSuggestedAssumptions.length > 0) {
    nextState = withDerivedState({
      ...nextState,
      pendingAssumptions: uniqueSuggestedAssumptions,
      messages: [...nextState.messages, buildAssumptionPrompt(result)],
    });
  } else if (hasCoreCoverage) {
    nextState = withDerivedState(nextState);
    nextState = {
      ...nextState,
      messages: [...nextState.messages, buildPreviewMessage(nextState)],
    };
  } else {
    const assistantMessage = createAssistantMessage(result.assistantReply, {
      quickReplies: result.quickReplies,
    });
    nextState = {
      ...nextState,
      messages: [...nextState.messages, assistantMessage],
    };
  }

  await saveSessionState(sessionId, nextState);
  return nextState;
}
