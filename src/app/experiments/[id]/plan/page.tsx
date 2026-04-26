"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { FailureModesPanel } from "@/components/failure-modes-panel";
import { HelpInfoButton } from "@/components/help-info-button";
import { NoveltyBadge } from "@/components/novelty-badge";
import { ReviewChatBubble } from "@/components/review-chat-bubble";
import { BudgetTab } from "@/components/tabs/budget-tab";
import { MaterialsTab } from "@/components/tabs/materials-tab";
import { ProtocolTab } from "@/components/tabs/protocol-tab";
import { SourcesTab } from "@/components/tabs/sources-tab";
import { TimelineTab } from "@/components/tabs/timeline-tab";
import { ValidationTab } from "@/components/tabs/validation-tab";
import { getNoveltyProvenance, getStatusMeaning } from "@/lib/help-content";
import type { ExperimentDetailResponse, ExperimentPlan } from "@/lib/types";
import type { AppliedFeedbackTrace } from "@/lib/review-types";
import type {
  CriticSummary,
  LiteratureQcSummary,
  WorkflowVersion,
} from "@/lib/workflow-types";
import type { PlanningBrief } from "@/lib/intake-types";

type TabKey = "protocol" | "materials" | "budget" | "timeline" | "validation" | "failure_modes" | "sources";

const TABS: { key: TabKey; label: string }[] = [
  { key: "protocol", label: "Protocol" },
  { key: "materials", label: "Materials" },
  { key: "budget", label: "Budget" },
  { key: "timeline", label: "Timeline" },
  { key: "validation", label: "Validation" },
  { key: "failure_modes", label: "Failure Modes" },
  { key: "sources", label: "Sources" },
];

function scoreColor(score: number) {
  if (score >= 70) return "text-green-400";
  if (score >= 50) return "text-amber-400";
  return "text-red-400";
}

interface PlanViewData {
  hypothesis: string;
  qc: LiteratureQcSummary | null;
  plan: ExperimentPlan;
  critic: CriticSummary | null;
  planningBrief: PlanningBrief | null;
  workflowVersion: WorkflowVersion;
  qualityNote: string | null;
  appliedFeedback: AppliedFeedbackTrace[];
  runError: string | null;
}

export default function PlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [data, setData] = useState<PlanViewData | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("protocol");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/experiments/${id}`, { cache: "no-store" })
      .then((response) => response.json())
      .then((detail: ExperimentDetailResponse) => {
        if (!detail.plan) {
          setError(detail.runError ?? "Plan not ready yet — finish the Operon AI pipeline first.");
        } else if (detail.workflowVersion === "pipeline_v2" && (!detail.critic || !detail.qc)) {
          setError(detail.runError ?? "Plan not ready yet — finish the Operon AI pipeline first.");
        } else {
          setData({
            hypothesis: detail.hypothesis,
            qc: detail.qc,
            plan: detail.plan,
            critic: detail.critic,
            planningBrief: detail.planningBrief,
            workflowVersion: detail.workflowVersion,
            qualityNote: detail.qualityNote,
            appliedFeedback: detail.appliedFeedback,
            runError: detail.runError,
          });
        }
        setLoading(false);
      })
      .catch((loadError: unknown) => {
        setError(loadError instanceof Error ? loadError.message : "Failed to load plan");
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="font-mono text-[#94A3B8] animate-pulse">Loading plan…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4">
        <p className="font-mono text-[#B91C1C] text-sm">✗ {error ?? "Plan not found"}</p>
        <Link href="/" className="text-sm font-mono text-[#64748B] hover:text-[#111827]">
          Return to dashboard
        </Link>
      </div>
    );
  }

  const { plan, critic, qc, planningBrief, workflowVersion, qualityNote, appliedFeedback, runError } = data;
  const isLegacy = workflowVersion === "legacy_preview";

  return (
    <div className="min-h-screen">
      {/* Pinned plan header */}
      <div className="sticky top-0 z-10 bg-white border-b border-[#E2E8F0] px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <h1
            className="font-bold text-[#111827] text-base truncate"
            style={{ fontFamily: "var(--font-serif)", letterSpacing: "-0.02em" }}
          >
            {plan.title}
          </h1>
          <div className="flex flex-wrap items-center gap-3 mt-1.5">
            {qc ? (
              <>
                <NoveltyBadge signal={qc.noveltySignal} />
                <HelpInfoButton topicId="guide-novelty" label="Open novelty guide" />
              </>
            ) : (
              <span className="font-mono text-xs px-2 py-0.5 rounded border bg-[#FFFBEB] text-[#92400E] border-[#B45309]">
                Legacy preview
              </span>
            )}
            {critic ? (
              <div className="inline-flex items-center gap-2">
                <span className={`font-mono text-sm font-semibold ${scoreColor(critic.confidenceScore)}`}>
                  Score: {critic.confidenceScore}/100
                </span>
                <HelpInfoButton topicId="guide-score" label="Open score guide" />
              </div>
            ) : (
              <span className="font-mono text-xs text-[#94A3B8]">Pre-pipeline record</span>
            )}
            <span className="font-mono text-sm text-[#4B5563]">
              {plan.currency} {plan.totalBudgetEstimate.toLocaleString()}
            </span>
            <span className="font-mono text-xs text-[#64748B]">
              {plan.timeline.length} phases · {plan.protocol.length} steps
            </span>
          </div>
          {qc && (
            <p className="mt-2 text-xs text-[#64748B] leading-relaxed">{getNoveltyProvenance(qc)}</p>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div className="sticky top-[73px] z-10 bg-white border-b border-[#E2E8F0] px-6">
        <div className="max-w-4xl mx-auto flex gap-0 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="px-4 py-3 font-mono text-sm shrink-0 border-b-2 transition-colors"
              style={{
                borderBottomColor: activeTab === tab.key ? "#0D9488" : "transparent",
                color: activeTab === tab.key ? "#0D9488" : "#64748B",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {isLegacy && (
          <div className="mb-6 bg-[#FFFBEB] border border-[#B45309] rounded-lg p-4">
            <p className="text-[#92400E] text-sm font-mono">
              Legacy record — rendered read-only without Literature QC or critic metadata.
            </p>
          </div>
        )}

        {!isLegacy && qualityNote && (
          <div className="mb-6 bg-[#F0FDF4] border border-[#16A34A] rounded-lg p-4">
            <p className="text-[#166534] text-sm font-mono" title={getStatusMeaning("ready")}>
              {qualityNote}
            </p>
          </div>
        )}

        {!isLegacy && !qualityNote && critic && (
          <div className="mb-6 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg p-4">
            <p className="text-[#475569] text-sm font-mono" title={getStatusMeaning("ready")}>
              Operon AI completed internal QA before showing this plan. Scientist review is still recommended before execution.
            </p>
          </div>
        )}

        {appliedFeedback.length > 0 && (
          <div className="mb-6 bg-[#EFF6FF] border border-[#2563EB] rounded-lg p-4">
            <p className="text-[#1D4ED8] text-sm font-mono mb-3">
              This plan incorporated {appliedFeedback.length} prior scientist correction{appliedFeedback.length === 1 ? "" : "s"} from similar experiments.
            </p>
            <div className="flex flex-col gap-3">
              {appliedFeedback.map((feedback) => (
                <div key={feedback.correctionId} className="bg-white border border-[#BFDBFE] rounded-lg p-3">
                  <p className="text-[11px] font-mono text-[#1D4ED8] uppercase tracking-wider mb-1">
                    {feedback.section}
                  </p>
                  <p className="text-sm text-[#111827] leading-relaxed">{feedback.correctedText}</p>
                  <p className="text-xs text-[#475569] mt-1">{feedback.reason}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {planningBrief && (
          <div className="mb-6 bg-white border border-[#E2E8F0] rounded-lg p-4">
            <p className="text-xs font-mono text-[#64748B] uppercase tracking-wider mb-3">Confirmed Intake Brief</p>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <p className="text-[11px] font-mono text-[#94A3B8] uppercase tracking-wider mb-1">Intervention</p>
                <p className="text-sm text-[#334155] leading-relaxed">{planningBrief.intervention}</p>
              </div>
              <div>
                <p className="text-[11px] font-mono text-[#94A3B8] uppercase tracking-wider mb-1">Model System</p>
                <p className="text-sm text-[#334155] leading-relaxed">{planningBrief.modelSystem}</p>
              </div>
              <div>
                <p className="text-[11px] font-mono text-[#94A3B8] uppercase tracking-wider mb-1">Primary Endpoint</p>
                <p className="text-sm text-[#334155] leading-relaxed">{planningBrief.primaryEndpoint}</p>
              </div>
              <div>
                <p className="text-[11px] font-mono text-[#94A3B8] uppercase tracking-wider mb-1">Comparator</p>
                <p className="text-sm text-[#334155] leading-relaxed">{planningBrief.comparator}</p>
              </div>
            </div>
          </div>
        )}

        {runError && !isLegacy && (
          <div className="mb-6 bg-white border border-[#E2E8F0] rounded-lg p-4">
            <p className="text-xs font-mono text-[#64748B] uppercase tracking-wider mb-2">Latest Run Error</p>
            <p className="text-[#4B5563] text-sm">{runError}</p>
          </div>
        )}

        {activeTab === "protocol" && <ProtocolTab steps={plan.protocol} />}
        {activeTab === "materials" && <MaterialsTab materials={plan.materials} />}
        {activeTab === "budget" && (
          <BudgetTab lines={plan.budget} total={plan.totalBudgetEstimate} currency={plan.currency} />
        )}
        {activeTab === "timeline" && <TimelineTab phases={plan.timeline} />}
        {activeTab === "validation" && <ValidationTab validationApproach={plan.validationApproach} />}
        {activeTab === "failure_modes" && <FailureModesPanel failureModes={plan.failureModes} />}
        {activeTab === "sources" && <SourcesTab sources={plan.sources} />}

        <details className="mt-8">
          <summary className="text-xs font-mono text-[#94A3B8] cursor-pointer hover:text-[#64748B]">
            Generation metadata
          </summary>
          <div className="mt-2 flex flex-wrap gap-4 text-xs font-mono text-[#94A3B8]">
            <span>Model: claude-sonnet-4-5</span>
            <span>Generated: {plan.generatedAt}</span>
            <span>Record: {isLegacy ? "legacy preview" : "pipeline draft"}</span>
            {critic && <span>Internal QA: {critic.summary}</span>}
          </div>
        </details>

      </div>
      <ReviewChatBubble experimentId={id} />
    </div>
  );
}
