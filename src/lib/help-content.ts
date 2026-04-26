// Created: 2026-04-26

import type { LiteratureQcSummary, NoveltySignal } from "./workflow-types";

export const HOW_TO_USE_STEPS = [
  "Use the conversational intake chat to describe the intervention, model system, endpoint, and comparator in natural language.",
  "Let Operon AI keep asking follow-ups until the planning brief is sufficient for a real protocol, budget, and validation design.",
  "Review the synthesized hypothesis preview before starting analysis.",
  "Read Literature QC before the plan appears, then inspect the final protocol, materials, timeline, and validation sections.",
  "Treat the final draft as a quality-checked starting point for scientist review, not as unreviewed raw model output.",
];

export const STATUS_GLOSSARY = {
  pending: "A record exists, but analysis has not produced a review-ready draft yet.",
  running: "The pipeline is actively moving through intake confirmation, QC, planning, or internal QA.",
  completed: "The pipeline finished and produced a review-ready draft after internal quality checks.",
  failed: "A pipeline stage stopped with a persisted error. Review the failure reason before retrying.",
  ready: "The latest draft passed internal QA and can be reviewed as a candidate plan.",
  legacy_preview: "This is a pre-pipeline record rendered for compatibility, not a full Operon AI run artifact.",
} as const;

export const NOVELTY_INDEX: Record<NoveltySignal, string> = {
  not_found: "Operon AI found no close prior protocol or paper match in the queried sources.",
  similar_exists: "Related work exists, but the hypothesis still appears meaningfully distinct in intervention, endpoint, or setup.",
  exact_match: "A close match already exists in the literature or protocol ecosystem. Treat the hypothesis as needing differentiation.",
};

export const CRITIC_SCORE_GUIDE = [
  "90-100: unusually strong operational draft after internal QA.",
  "70-89: usable draft with normal scientist review still recommended.",
  "50-69: low-confidence draft that likely needs another repair pass or manual review.",
  "0-49: high-risk draft that should be treated as a generation failure.",
];

export function getCriticScoreMeaning(score: number) {
  if (score >= 90) {
    return CRITIC_SCORE_GUIDE[0];
  }

  if (score >= 70) {
    return CRITIC_SCORE_GUIDE[1];
  }

  if (score >= 50) {
    return CRITIC_SCORE_GUIDE[2];
  }

  return CRITIC_SCORE_GUIDE[3];
}

export function getStatusMeaning(status: string, stage: string | null = null) {
  if (status === "running" && stage) {
    return `${STATUS_GLOSSARY.running} Current stage: ${stage.replaceAll("_", " ")}.`;
  }

  if (status in STATUS_GLOSSARY) {
    return STATUS_GLOSSARY[status as keyof typeof STATUS_GLOSSARY];
  }

  if (status === "blocked") {
    return "This is a legacy lifecycle state from an older Operon AI pipeline. Current drafts no longer use blocked as a user-facing status.";
  }

  return "Operon AI is tracking this record, but the current lifecycle label is not part of the standard glossary.";
}

export function getNoveltyMeaning(signal: NoveltySignal) {
  return NOVELTY_INDEX[signal];
}

export function getNoveltyProvenance(qc: LiteratureQcSummary) {
  return `Queried Semantic Scholar and Tavily · ${qc.referenceCount} references considered · ${getNoveltyMeaning(qc.noveltySignal)}`;
}
