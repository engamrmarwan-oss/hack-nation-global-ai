"use client";

import { HelpInfoButton } from "@/components/help-info-button";
import { getCriticScoreMeaning } from "@/lib/help-content";
import { NoveltyBadge } from "./novelty-badge";
import type { NoveltySignal } from "@/lib/workflow-types";

function scoreColor(score: number) {
  if (score >= 70) return "text-[#15803D]";
  if (score >= 50) return "text-[#B45309]";
  return "text-[#B91C1C]";
}

function scoreLabel(score: number) {
  if (score >= 70) return "Quality-checked — review-ready";
  if (score >= 50) return "Low confidence — review closely";
  return "High risk — backend repair likely required";
}

interface PlanSummaryCardProps {
  title: string;
  noveltySignal: NoveltySignal;
  confidenceScore: number;
  totalBudget: number;
  currency: string;
  timelinePhases: number;
  protocolSteps: number;
  summary?: string;
}

export function PlanSummaryCard({
  title,
  noveltySignal,
  confidenceScore,
  totalBudget,
  currency,
  timelinePhases,
  protocolSteps,
  summary,
}: PlanSummaryCardProps) {
  return (
    <div className="bg-white border border-[#E2E8F0] rounded-lg p-5 flex flex-col gap-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <NoveltyBadge signal={noveltySignal} />
        <div className="inline-flex items-center gap-2">
          <span className={`font-mono text-sm font-semibold ${scoreColor(confidenceScore)}`}>
            Score: {confidenceScore}/100
          </span>
          <HelpInfoButton topicId="guide-score" label="Open critic score guide" />
        </div>
        <span className="font-mono text-sm text-[#4B5563]">
          {currency} {totalBudget.toLocaleString()}
        </span>
        <span className="font-mono text-xs text-[#64748B]">
          {timelinePhases}-phase · {protocolSteps}-step protocol
        </span>
      </div>

      <h2 className="text-[#111827] font-semibold text-base leading-snug" style={{ fontFamily: "var(--font-serif)" }}>
        {title}
      </h2>

      <p className="text-xs font-mono text-[#64748B]">
        {scoreLabel(confidenceScore)} · {getCriticScoreMeaning(confidenceScore)}
      </p>

      {summary && <p className="text-[#4B5563] text-sm leading-relaxed">{summary}</p>}
    </div>
  );
}
