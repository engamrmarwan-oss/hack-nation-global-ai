// Created: 2026-04-26

import { NextRequest, NextResponse } from "next/server";
import { getReviewSession } from "@/lib/review-session-store";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getReviewSession(id);

  if (!session) {
    return NextResponse.json({ error: "Review session not found." }, { status: 404 });
  }

  return NextResponse.json(session);
}
