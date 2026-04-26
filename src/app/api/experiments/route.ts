import { NextRequest, NextResponse } from "next/server";
import { listExperiments } from "@/lib/experiment-data";
import { createExperimentFromPlanningBrief } from "@/lib/experiment-create";
import { planningBriefSchema } from "@/lib/intake-types";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    hypothesis?: string;
    planningBrief?: unknown;
  };
  const hypothesis = body.hypothesis?.trim();

  if (!hypothesis) {
    return NextResponse.json({ error: "hypothesis is required" }, { status: 400 });
  }

  const parsedBrief = planningBriefSchema.safeParse(body.planningBrief);
  if (!parsedBrief.success) {
    return NextResponse.json(
      { error: "A confirmed planning brief is required before analysis." },
      { status: 400 },
    );
  }

  const question = await createExperimentFromPlanningBrief({
    hypothesis,
    planningBrief: parsedBrief.data,
  });

  return NextResponse.json({ id: question.id });
}

export async function GET() {
  const experiments = await listExperiments();
  return NextResponse.json(experiments);
}
