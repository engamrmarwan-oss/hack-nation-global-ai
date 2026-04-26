// Created: 2026-04-26

import { db } from "@/lib/db";
import { getDefaultProjectId } from "@/lib/default-project";
import { planningBriefSchema, type PlanningBrief } from "@/lib/intake-types";
import { z } from "zod";

const createExperimentInputSchema = z.object({
  hypothesis: z.string().min(1),
  planningBrief: planningBriefSchema,
});

export async function createExperimentFromPlanningBrief(input: {
  hypothesis: string;
  planningBrief: PlanningBrief;
}) {
  const parsed = createExperimentInputSchema.parse({
    hypothesis: input.hypothesis.trim(),
    planningBrief: input.planningBrief,
  });

  const projectId = await getDefaultProjectId();
  const title = parsed.hypothesis.slice(0, 120);

  const question = await db.researchQuestion.create({
    data: {
      title,
      question: parsed.hypothesis,
      objective: parsed.planningBrief.primaryEndpoint || null,
      assumptionsJson: JSON.stringify(parsed.planningBrief),
      constraintsJson:
        parsed.planningBrief.claimConstraints.length > 0
          ? JSON.stringify(parsed.planningBrief.claimConstraints)
          : null,
      projectId,
      status: "draft",
    },
  });

  return question;
}
