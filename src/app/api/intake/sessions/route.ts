// Created: 2026-04-26

import { NextResponse } from "next/server";
import { createIntakeSession } from "@/lib/intake-session-store";

export async function POST() {
  const session = await createIntakeSession();
  return NextResponse.json(session);
}
