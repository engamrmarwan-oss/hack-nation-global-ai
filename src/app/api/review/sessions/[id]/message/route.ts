// Created: 2026-04-26

import { NextRequest, NextResponse } from "next/server";
import { applyReviewMessage } from "@/lib/review-session-store";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await req.json()) as {
    message?: string;
  };

  try {
    const state = await applyReviewMessage({
      sessionId: id,
      message: body.message,
    });

    return NextResponse.json({ id, state });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 400 },
    );
  }
}
