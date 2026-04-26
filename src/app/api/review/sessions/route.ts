// Created: 2026-04-26

import { NextRequest, NextResponse } from "next/server";
import { createReviewSession } from "@/lib/review-session-store";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    experimentId?: string;
  };

  if (!body.experimentId) {
    return NextResponse.json({ error: "experimentId is required." }, { status: 400 });
  }

  try {
    const session = await createReviewSession(body.experimentId);
    return NextResponse.json(session);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 400 },
    );
  }
}
