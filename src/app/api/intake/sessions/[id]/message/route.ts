// Created: 2026-04-26

import { NextRequest, NextResponse } from "next/server";
import { applyIntakeMessage } from "@/lib/intake-session-store";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await req.json()) as {
    message?: string;
    action?: "accept_assumptions" | "skip_assumptions";
  };

  try {
    const state = await applyIntakeMessage({
      sessionId: id,
      message: body.message,
      action: body.action,
    });

    return NextResponse.json({ id, state });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 400 },
    );
  }
}
