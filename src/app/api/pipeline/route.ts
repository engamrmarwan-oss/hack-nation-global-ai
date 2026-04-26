import { NextRequest } from "next/server";
import { runOrchestrator } from "@/lib/agents/orchestrator";
import { runLiteratureQc } from "@/lib/agents/literature-qc";
import { runPlanner } from "@/lib/agents/planner";
import { runCritic } from "@/lib/agents/critic";
import { planningBriefSchema, type PlanningBrief } from "@/lib/intake-types";
import { loadRelevantScientistFeedback } from "@/lib/scientist-feedback";
import { StructuredOutputError } from "@/lib/structured-output";
import { searchProtocolSources, searchScientificEvidence } from "@/lib/tavily";
import { db } from "@/lib/db";
import { getDefaultProjectId } from "@/lib/default-project";
import type { PipelineEvent } from "@/lib/types";
import {
  markStageCompleted,
  markStageFailed,
  markStageRunning,
  serializeStageData,
  createInitialRunStageData,
  type CriticSummary,
  type PlanningRunStageData,
} from "@/lib/workflow-types";

type VisibleStage = "orchestrator" | "literature_qc" | "planner" | "critic";

const MAX_QA_ATTEMPTS = 3;

function encode(event: PipelineEvent): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`);
}

function truncateSnippet(snippet: string, maxLength = 420) {
  if (snippet.length <= maxLength) {
    return snippet;
  }

  return `${snippet.slice(0, maxLength).trim()}...`;
}

function formatEvidenceSection(
  heading: string,
  results: Array<{ title: string; url: string; snippet: string }>,
  maxResults = 3,
) {
  const selected = results.slice(0, maxResults);
  if (selected.length === 0) {
    return "";
  }

  const lines = selected.map((result, index) =>
    [
      `${heading} ${index + 1}: ${result.title}`,
      `URL: ${result.url}`,
      `Snippet: ${truncateSnippet(result.snippet)}`,
    ].join("\n"),
  );

  return lines.join("\n\n");
}

function summarizeEvidence(
  scienceResults: Awaited<ReturnType<typeof searchScientificEvidence>>["results"],
  protocolResults: Awaited<ReturnType<typeof searchProtocolSources>>["results"],
) {
  const segments = [
    formatEvidenceSection("Science source", scienceResults, 3),
    formatEvidenceSection("Protocol source", protocolResults, 3),
  ].filter(Boolean);

  return segments.join("\n\n---\n\n");
}

function stageKeyForVisibleStage(stage: VisibleStage) {
  switch (stage) {
    case "orchestrator":
      return "questionProfile" as const;
    case "literature_qc":
      return "literatureQc" as const;
    case "planner":
      return "draftGeneration" as const;
    case "critic":
      return "criticValidation" as const;
  }
}

function parsePlanningBrief(value: string | null): PlanningBrief | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    const result = planningBriefSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

function previewDataForPlan(
  plan: Awaited<ReturnType<typeof runPlanner>>,
  {
    experimentId,
    profileObjective,
    projectId,
    runId,
    appliedFeedback,
  }: {
    experimentId: string;
    profileObjective: string;
    projectId: string;
    runId: string;
    appliedFeedback: Awaited<ReturnType<typeof loadRelevantScientistFeedback>>["appliedFeedback"];
  },
) {
  return {
    title: plan.title,
    status: "active",
    reviewStatus: "pending",
    summary: plan.summary,
    objective: profileObjective,
    hypothesis: plan.hypothesis,
    protocolJson: JSON.stringify(plan.protocol),
    controlsJson: JSON.stringify({
      comparator: profileObjective,
      generatedAt: plan.generatedAt,
    }),
    timelineJson: JSON.stringify(plan.timeline),
    materialsJson: JSON.stringify(plan.materials),
    budgetJson: JSON.stringify(plan.budget),
    staffingJson: JSON.stringify(plan.timeline),
    risksJson: JSON.stringify(plan.sources),
    validationJson: JSON.stringify({
      validationApproach: plan.validationApproach,
      totalBudgetEstimate: plan.totalBudgetEstimate,
      currency: plan.currency,
    }),
    failureModesJson: JSON.stringify(plan.failureModes),
    appliedFeedbackJson: JSON.stringify(appliedFeedback),
    evidenceSummaryJson: JSON.stringify(plan),
    projectId,
    questionId: experimentId,
    planningRunId: runId,
  };
}

function needsQaRepair(critic: CriticSummary) {
  return critic.blockers.length > 0 || critic.confidenceScore < 70;
}

function buildQaFeedback(critic: CriticSummary, attempt: number) {
  return [
    `QA attempt ${attempt} found issues that must be repaired before display.`,
    critic.blockers.length > 0
      ? `Critical findings:\n- ${critic.blockers.join("\n- ")}`
      : "",
    critic.warnings.length > 0
      ? `Warnings to tighten:\n- ${critic.warnings.join("\n- ")}`
      : "",
    `Summary: ${critic.summary}`,
    "Revise the plan so it better preserves the requested comparator, endpoint, sourcing realism, budget consistency, and timeline feasibility.",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function buildQualityNote(critic: CriticSummary, qaAttempts: number) {
  const passLabel = qaAttempts === 1 ? "1 QA pass" : `${qaAttempts} QA passes`;
  return `Internally quality-checked and refined across ${passLabel}. ${critic.summary}`;
}

function getPipelineErrorMessages(error: unknown, stage: VisibleStage) {
  if (error instanceof StructuredOutputError) {
    if (stage === "planner" && error.failureKind === "length_limit") {
      return {
        debugMessage: error.debugMessage,
        userMessage: "Plan generation exceeded structured output limits and could not be repaired automatically.",
      };
    }

    if (stage === "planner") {
      return {
        debugMessage: error.debugMessage,
        userMessage: "Plan generation produced invalid structured output and could not be repaired automatically.",
      };
    }

    if (stage === "critic") {
      return {
        debugMessage: error.debugMessage,
        userMessage: "Internal QA produced invalid structured output and could not be repaired automatically.",
      };
    }

    return {
      debugMessage: error.debugMessage,
      userMessage: error.message,
    };
  }

  const message = error instanceof Error ? error.message : String(error);
  return {
    debugMessage: message,
    userMessage: message,
  };
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    experimentId: string;
    feedback?: string;
  };
  const { experimentId, feedback } = body;

  const stream = new ReadableStream({
    async start(controller) {
      let runId: string | null = null;
      let previewId: string | null = null;
      let currentStage: VisibleStage = "orchestrator";
      let stageData: PlanningRunStageData = createInitialRunStageData();

      try {
        const projectId = await getDefaultProjectId();
        const question = await db.researchQuestion.findUnique({
          where: { id: experimentId },
          select: {
            id: true,
            question: true,
            assumptionsJson: true,
          },
        });

        if (!question) {
          throw new Error("Experiment not found.");
        }

        const hypothesis = question.question.trim();
        const planningBrief = parsePlanningBrief(question.assumptionsJson);

        if (!planningBrief) {
          throw new Error(
            "Experiment is missing a confirmed planning brief. Return to the intake chat and confirm the hypothesis preview again.",
          );
        }

        const startedAt = new Date();
        stageData = markStageRunning(
          stageData,
          "questionProfile",
          startedAt.toISOString(),
          "Building the planning profile from the confirmed intake brief.",
        );

        const run = await db.planningRun.create({
          data: {
            mode: "pipeline",
            status: "running",
            stage: "question_profile",
            stageDataJson: serializeStageData(stageData),
            startedAt,
            projectId,
            questionId: experimentId,
          },
        });
        runId = run.id;

        controller.enqueue(encode({ stage: "orchestrator", status: "running" }));
        const { profile, isValid, validationWarnings } = await runOrchestrator(hypothesis);

        const orchestratorCompletedAt = new Date().toISOString();
        stageData = markStageCompleted(
          stageData,
          "questionProfile",
          orchestratorCompletedAt,
          profile,
          isValid
            ? "Planning profile completed from the confirmed intake."
            : `Profile completed with warnings: ${validationWarnings.join("; ")}`,
        );
        stageData = markStageRunning(
          stageData,
          "literatureQc",
          orchestratorCompletedAt,
          "Searching literature and grounded evidence sources.",
        );

        await db.$transaction([
          db.planningRun.update({
            where: { id: run.id },
            data: {
              stage: "literature_qc",
              stageDataJson: serializeStageData(stageData),
            },
          }),
          db.researchQuestion.update({
            where: { id: experimentId },
            data: {
              profileSummaryJson: JSON.stringify(profile),
              status: isValid ? "active" : "draft",
              objective: validationWarnings.join("; ") || null,
              retrievalStatus: "running",
              previewStatus: "idle",
            },
          }),
        ]);

        controller.enqueue(encode({ stage: "orchestrator", status: "completed", data: profile }));
        currentStage = "literature_qc";
        controller.enqueue(encode({ stage: "literature_qc", status: "running" }));

        const qc = await runLiteratureQc(profile);
        const qcCompletedAt = new Date().toISOString();
        stageData = markStageCompleted(
          stageData,
          "literatureQc",
          qcCompletedAt,
          qc,
          `${qc.referenceCount} evidence references scored with novelty ${qc.noveltySignal}.`,
        );
        stageData = markStageRunning(
          stageData,
          "evidenceRetrieval",
          qcCompletedAt,
          "Collecting detailed grounding from Tavily.",
        );

        await db.$transaction([
          db.planningRun.update({
            where: { id: run.id },
            data: {
              stage: "evidence_retrieval",
              stageDataJson: serializeStageData(stageData),
            },
          }),
          db.researchQuestion.update({
            where: { id: experimentId },
            data: {
              literatureQcJson: JSON.stringify(qc),
              retrievalStatus: "running",
            },
          }),
        ]);

        controller.enqueue(encode({ stage: "literature_qc", status: "completed", data: qc }));
        currentStage = "planner";

        const [scienceSettled, protocolSettled] = await Promise.allSettled([
          searchScientificEvidence(profile.keyTerms.join(" ")),
          searchProtocolSources(profile.experimentClass, profile.keyTerms),
        ]);
        const feedbackMemory = await loadRelevantScientistFeedback({
          projectId,
          planningBrief,
          profile,
        });
        const combinedFeedback = [feedbackMemory.feedbackExamples, feedback]
          .filter(Boolean)
          .join("\n\n");

        const scienceEvidence =
          scienceSettled.status === "fulfilled" ? scienceSettled.value : { answer: null, results: [] };
        const protocolEvidence =
          protocolSettled.status === "fulfilled" ? protocolSettled.value : { answer: null, results: [] };

        const evidenceCompletedAt = new Date().toISOString();
        stageData = markStageCompleted(
          stageData,
          "evidenceRetrieval",
          evidenceCompletedAt,
          {
            sourceCount: scienceEvidence.results.length + protocolEvidence.results.length,
            answer: scienceEvidence.answer ?? protocolEvidence.answer ?? null,
          },
          `Collected ${scienceEvidence.results.length + protocolEvidence.results.length} grounding sources.`,
        );
        stageData = markStageRunning(
          stageData,
          "draftGeneration",
          evidenceCompletedAt,
          "Generating the experiment draft from the confirmed brief.",
        );

        await db.$transaction([
          db.planningRun.update({
            where: { id: run.id },
            data: {
              stage: "draft_generation",
              stageDataJson: serializeStageData(stageData),
            },
          }),
          db.researchQuestion.update({
            where: { id: experimentId },
            data: {
              retrievalStatus: "completed",
              previewStatus: "running",
            },
          }),
        ]);

        controller.enqueue(encode({ stage: "planner", status: "running" }));

        const tavilyEvidence = summarizeEvidence(scienceEvidence.results, protocolEvidence.results);
        let qaAttempts = 0;
        let qaFeedback: string | undefined;
        let finalPlan: Awaited<ReturnType<typeof runPlanner>> | null = null;
        let finalCritic: CriticSummary | null = null;

        while (qaAttempts < MAX_QA_ATTEMPTS) {
          qaAttempts += 1;

          const candidatePlan = await runPlanner(
            hypothesis,
            profile,
            tavilyEvidence,
            planningBrief,
            combinedFeedback || undefined,
            qaFeedback,
          );

          if (!previewId) {
            const preview = await db.planPreview.create({
              data: previewDataForPlan(candidatePlan, {
                experimentId,
                profileObjective: profile.primaryObjective,
                projectId,
                runId: run.id,
                appliedFeedback: feedbackMemory.appliedFeedback,
              }),
            });
            previewId = preview.id;

            const plannerCompletedAt = new Date().toISOString();
            stageData = markStageCompleted(
              stageData,
              "draftGeneration",
              plannerCompletedAt,
              {
                previewId: preview.id,
                previewTitle: preview.title,
              },
              `Draft preview ${preview.id} created.`,
            );
            stageData = markStageRunning(
              stageData,
              "criticValidation",
              plannerCompletedAt,
              "Running hidden internal QA on the generated draft.",
            );

            await db.$transaction([
              db.planningRun.update({
                where: { id: run.id },
                data: {
                  stage: "critic_validation",
                  stageDataJson: serializeStageData(stageData),
                },
              }),
              db.researchQuestion.update({
                where: { id: experimentId },
                data: {
                  previewStatus: "pending",
                },
              }),
            ]);

            controller.enqueue(encode({ stage: "planner", status: "completed" }));
            currentStage = "critic";
            controller.enqueue(encode({ stage: "critic", status: "running" }));
          } else {
            await db.planPreview.update({
              where: { id: previewId },
              data: previewDataForPlan(candidatePlan, {
                experimentId,
                profileObjective: profile.primaryObjective,
                projectId,
                runId: run.id,
                appliedFeedback: feedbackMemory.appliedFeedback,
              }),
            });
          }

          const candidateCritic = await runCritic(candidatePlan, planningBrief);
          finalPlan = candidatePlan;
          finalCritic = candidateCritic;

          await db.planPreview.update({
            where: { id: previewId! },
            data: {
              criticSummaryJson: JSON.stringify(candidateCritic),
              reviewStatus: "pending",
            },
          });

          if (!needsQaRepair(candidateCritic)) {
            break;
          }

          qaFeedback = buildQaFeedback(candidateCritic, qaAttempts);
        }

        if (!finalPlan || !finalCritic || !previewId) {
          throw new Error("Operon AI did not produce a final draft.");
        }

        if (needsQaRepair(finalCritic)) {
          throw new Error(
            `Operon AI could not satisfy internal QA after ${qaAttempts} attempts. ${finalCritic.summary}`,
          );
        }

        const criticCompletedAt = new Date().toISOString();
        const qualityNote = buildQualityNote(finalCritic, qaAttempts);
        stageData = markStageCompleted(
          stageData,
          "criticValidation",
          criticCompletedAt,
          finalCritic,
          qualityNote,
        );
        stageData = markStageCompleted(
          stageData,
          "reviewReady",
          criticCompletedAt,
          {
            previewId,
            qualityChecked: true,
          },
          "Draft is ready after internal QA.",
        );

        await db.$transaction([
          db.planPreview.update({
            where: { id: previewId },
            data: {
              criticSummaryJson: JSON.stringify(finalCritic),
              reviewStatus: "ready",
            },
          }),
          db.planningRun.update({
            where: { id: run.id },
            data: {
              status: "completed",
              stage: "review_ready",
              stageDataJson: serializeStageData(stageData),
              notes: qualityNote,
              finishedAt: new Date(criticCompletedAt),
            },
          }),
          db.researchQuestion.update({
            where: { id: experimentId },
            data: {
              previewStatus: "ready",
            },
          }),
        ]);

        controller.enqueue(encode({ stage: "critic", status: "completed", data: finalCritic }));
        controller.enqueue(encode({ stage: "done", status: "completed" }));
      } catch (error) {
        const { debugMessage, userMessage } = getPipelineErrorMessages(error, currentStage);
        const failedAt = new Date().toISOString();
        stageData = markStageFailed(stageData, stageKeyForVisibleStage(currentStage), failedAt, debugMessage);

        if (runId) {
          await db.$transaction([
            db.planningRun.update({
              where: { id: runId },
              data: {
                status: "failed",
                error: userMessage,
                finishedAt: new Date(failedAt),
                stageDataJson: serializeStageData(stageData),
              },
            }),
            db.researchQuestion.update({
              where: { id: experimentId },
              data: {
                previewStatus: "failed",
              },
            }),
            ...(previewId
              ? [
                  db.planPreview.update({
                    where: { id: previewId },
                    data: {
                      reviewStatus: "failed",
                    },
                  }),
                ]
              : []),
          ]);
        }

        controller.enqueue(encode({ stage: currentStage, status: "failed", error: userMessage }));
        controller.enqueue(encode({ stage: "error", status: "failed", error: userMessage }));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
