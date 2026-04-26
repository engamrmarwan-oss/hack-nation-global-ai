// Created: 2026-04-26

import { NextRequest, NextResponse } from "next/server";
import { confirmReviewSession, getReviewSession } from "@/lib/review-session-store";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getReviewSession(id);

  if (!session) {
    return NextResponse.json({ error: "Review session not found." }, { status: 404 });
  }

  try {
    const result = await confirmReviewSession(id);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 400 },
    );
  }
}
