// Created: 2026-04-26

import { db } from "@/lib/db";
import type { PlanningBrief } from "./intake-types";
import type { QuestionProfile } from "./workflow-types";
import {
  appliedFeedbackTraceSchema,
  type AppliedFeedbackTrace,
} from "./review-types";

function normalizeText(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function tokenize(text: string) {
  return Array.from(
    new Set(
      normalizeText(text)
        .split(" ")
        .filter((token) => token.length >= 4),
    ),
  );
}

function overlapScore(a: string, b: string) {
  const aTokens = tokenize(a);
  const bTokens = new Set(tokenize(b));
  return aTokens.reduce((sum, token) => sum + (bTokens.has(token) ? 1 : 0), 0);
}

function scoreReviewMatch({
  planningBrief,
  profile,
  review,
}: {
  planningBrief: PlanningBrief | null;
  profile: QuestionProfile;
  review: {
    domainHint: string | null;
    experimentClass: string | null;
    interventionText: string | null;
    endpointText: string | null;
    createdAt: Date;
  };
}) {
  let score = 0;

  if (review.experimentClass === profile.experimentClass) {
    score += 50;
  }

  if (planningBrief?.domainHint && review.domainHint === planningBrief.domainHint) {
    score += 30;
  }

  score += overlapScore(
    `${planningBrief?.intervention ?? ""} ${profile.intervention}`,
    review.interventionText ?? "",
  ) * 4;

  score += overlapScore(
    `${planningBrief?.primaryEndpoint ?? ""} ${profile.primaryEndpoint}`,
    review.endpointText ?? "",
  ) * 5;

  const ageDays = Math.max(
    0,
    Math.floor((Date.now() - review.createdAt.getTime()) / (1000 * 60 * 60 * 24)),
  );
  score += Math.max(0, 10 - Math.floor(ageDays / 7));

  return score;
}

export async function loadRelevantScientistFeedback({
  projectId,
  planningBrief,
  profile,
  maxCorrections = 3,
}: {
  projectId: string;
  planningBrief: PlanningBrief | null;
  profile: QuestionProfile;
  maxCorrections?: number;
}) {
  const candidateReviews = await db.scientistReview.findMany({
    where: {
      projectId,
      experimentClass: profile.experimentClass,
      corrections: {
        some: {},
      },
    },
    include: {
      corrections: {
        orderBy: { createdAt: "desc" },
      },
      question: {
        select: {
          question: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const ranked = candidateReviews
    .map((review) => ({
      review,
      score: scoreReviewMatch({
        planningBrief,
        profile,
        review,
      }),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  const appliedFeedback = ranked
    .flatMap(({ review }) =>
      review.corrections.map((correction) => ({
        reviewId: review.id,
        correctionId: correction.id,
        section: correction.section,
        originalText: correction.originalText,
        correctedText: correction.correctedText,
        reason: correction.reason,
        sourceHypothesis: review.question.question,
      })),
    )
    .slice(0, maxCorrections)
    .map((trace) => appliedFeedbackTraceSchema.parse(trace)) satisfies AppliedFeedbackTrace[];

  if (appliedFeedback.length === 0) {
    return {
      appliedFeedback,
      feedbackExamples: undefined,
    };
  }

  const feedbackExamples = appliedFeedback
    .map((feedback, index) =>
      [
        `Scientist correction ${index + 1}`,
        `Section: ${feedback.section}`,
        `Original: ${feedback.originalText}`,
        `Corrected: ${feedback.correctedText}`,
        `Reason: ${feedback.reason}`,
      ].join("\n"),
    )
    .join("\n\n");

  return {
    appliedFeedback,
    feedbackExamples,
  };
}
