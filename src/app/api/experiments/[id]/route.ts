import { NextRequest, NextResponse } from "next/server";
import { getExperimentDetail } from "@/lib/experiment-data";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const experiment = await getExperimentDetail(id);
  if (!experiment) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json(experiment);
}
