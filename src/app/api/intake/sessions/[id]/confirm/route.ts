// Created: 2026-04-26

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createExperimentFromPlanningBrief } from "@/lib/experiment-create";
import { getIntakeSession } from "@/lib/intake-session-store";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getIntakeSession(id);

  if (!session) {
    return NextResponse.json({ error: "Intake session not found." }, { status: 404 });
  }

  if (!session.state.readyToSynthesize || !session.state.synthesizedHypothesis) {
    return NextResponse.json(
      { error: "Operon AI still needs more intake detail before analysis can start." },
      { status: 400 },
    );
  }

  const question = await createExperimentFromPlanningBrief({
    hypothesis: session.state.synthesizedHypothesis,
    planningBrief: session.state.planningBrief,
  });

  await db.planningRun.update({
    where: { id },
    data: {
      status: "completed",
      stage: "confirmed",
      finishedAt: new Date(),
      notes: `Confirmed planning brief for experiment ${question.id}.`,
    },
  });

  return NextResponse.json({ id: question.id });
}
