"use client";

import { useCallback, useEffect, useRef, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FailureModesPanel } from "@/components/failure-modes-panel";
import { HelpInfoButton } from "@/components/help-info-button";
import { NoveltyBadge } from "@/components/novelty-badge";
import { PlanSummaryCard } from "@/components/plan-summary-card";
import { getNoveltyProvenance, getStatusMeaning } from "@/lib/help-content";
import type { ExperimentDetailResponse, ExperimentPlan, PipelineEvent } from "@/lib/types";
import type { CriticSummary, LiteratureQcSummary } from "@/lib/workflow-types";

type StageStatus = "idle" | "running" | "done" | "failed";

interface StageState {
  orchestrator: StageStatus;
  literature_qc: StageStatus;
  planner: StageStatus;
  critic: StageStatus;
}

interface ElapsedState {
  orchestrator: number;
  literature_qc: number;
  planner: number;
  critic: number;
}

const STAGE_LABELS: Record<keyof StageState, string> = {
  orchestrator: "① Intake confirmed",
  literature_qc: "② Literature QC",
  planner: "③ Plan generation",
  critic: "④ Internal QA",
};

const IDLE_STAGES: StageState = {
  orchestrator: "idle",
  literature_qc: "idle",
  planner: "idle",
  critic: "idle",
};

function StageDot({ status, elapsed }: { status: StageStatus; elapsed: number }) {
  if (status === "running") {
    return (
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse inline-block" />
        <span className="text-amber-300 font-mono text-xs">{elapsed}s</span>
      </div>
    );
  }
  if (status === "done") {
    return <span className="text-green-400 font-mono text-xs">✓ {elapsed}s</span>;
  }
  if (status === "failed") {
    return <span className="text-red-400 font-mono text-xs">✗ failed</span>;
  }
  return <span className="w-2.5 h-2.5 rounded-full bg-slate-700 inline-block" />;
}

function stageStateFromDetail(detail: ExperimentDetailResponse): StageState {
  if (detail.status === "completed") {
    return {
      orchestrator: "done",
      literature_qc: "done",
      planner: "done",
      critic: "done",
    };
  }

  if (detail.status === "failed") {
    switch (detail.stage) {
      case "question_profile":
        return { ...IDLE_STAGES, orchestrator: "failed" };
      case "literature_qc":
        return { ...IDLE_STAGES, orchestrator: "done", literature_qc: "failed" };
      case "critic_validation":
        return {
          orchestrator: "done",
          literature_qc: "done",
          planner: "done",
          critic: "failed",
        };
      case "draft_generation":
      case "evidence_retrieval":
        return {
          orchestrator: "done",
          literature_qc: "done",
          planner: "failed",
          critic: "idle",
        };
      default:
        return IDLE_STAGES;
    }
  }

  switch (detail.stage) {
    case "question_profile":
      return { ...IDLE_STAGES, orchestrator: "running" };
    case "literature_qc":
      return { ...IDLE_STAGES, orchestrator: "done", literature_qc: "running" };
    case "evidence_retrieval":
      return { ...IDLE_STAGES, orchestrator: "done", literature_qc: "done" };
    case "draft_generation":
      return {
        orchestrator: "done",
        literature_qc: "done",
        planner: "running",
        critic: "idle",
      };
    case "critic_validation":
      return {
        orchestrator: "done",
        literature_qc: "done",
        planner: "done",
        critic: "running",
      };
    default:
      return IDLE_STAGES;
  }
}

export default function PipelinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [hypothesis, setHypothesis] = useState("");
  const [stages, setStages] = useState<StageState>(IDLE_STAGES);
  const [elapsed, setElapsed] = useState<ElapsedState>({
    orchestrator: 0,
    literature_qc: 0,
    planner: 0,
    critic: 0,
  });
  const [qc, setQc] = useState<LiteratureQcSummary | null>(null);
  const [plan, setPlan] = useState<ExperimentPlan | null>(null);
  const [critic, setCritic] = useState<CriticSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [qualityNote, setQualityNote] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const [isPollingExistingRun, setIsPollingExistingRun] = useState(false);

  const stageStartRef = useRef<Partial<Record<keyof StageState, number>>>({});
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ranRef = useRef(false);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      const now = Date.now();
      setElapsed((previous) => {
        const next = { ...previous };
        for (const key of Object.keys(stageStartRef.current) as Array<keyof StageState>) {
          if (stageStartRef.current[key] !== undefined) {
            next[key] = Math.floor((now - stageStartRef.current[key]!) / 1000);
          }
        }
        return next;
      });
    }, 500);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const loadDetail = useCallback(async () => {
    const response = await fetch(`/api/experiments/${id}`, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Failed to load experiment (${response.status})`);
    }

    return (await response.json()) as ExperimentDetailResponse;
  }, [id]);

  const hydrateFromDetail = useCallback((detail: ExperimentDetailResponse) => {
    setHypothesis(detail.hypothesis);
    setQc(detail.qc);
    setPlan(detail.plan);
    setCritic(detail.critic);
    setError(detail.runError);
    setQualityNote(detail.qualityNote);
    setStages(stageStateFromDetail(detail));
    setStarted(detail.status !== "pending" || Boolean(detail.runId));
  }, []);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    stopPolling();
    setIsPollingExistingRun(true);
    pollRef.current = setInterval(() => {
      loadDetail()
        .then((detail) => {
          hydrateFromDetail(detail);
          if (detail.status !== "running") {
            stopPolling();
            setIsPollingExistingRun(false);
          }
        })
        .catch((loadError: unknown) => {
          setError(loadError instanceof Error ? loadError.message : String(loadError));
          stopPolling();
          setIsPollingExistingRun(false);
        });
    }, 4000);
  }, [hydrateFromDetail, loadDetail, stopPolling]);

  const startPipeline = useCallback(async (runHypothesis?: string) => {
    stopPolling();
    setIsPollingExistingRun(false);
    setError(null);
    setQc(null);
    setPlan(null);
    setCritic(null);
    setQualityNote(null);
    setStages(IDLE_STAGES);
    setElapsed({
      orchestrator: 0,
      literature_qc: 0,
      planner: 0,
      critic: 0,
    });
    stageStartRef.current = {};
    setStarted(true);

    const hypothesisToRun = runHypothesis ?? (await loadDetail()).hypothesis;
    setHypothesis(hypothesisToRun);

    const response = await fetch("/api/pipeline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ experimentId: id }),
    });

    if (!response.body) {
      setError("No response stream from server.");
      setStages((previous) => ({ ...previous, orchestrator: "failed" }));
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const chunks = buffer.split("\n\n");
      buffer = chunks.pop() ?? "";

      for (const chunk of chunks) {
        const line = chunk.trim();
        if (!line.startsWith("data: ")) continue;

        const event = JSON.parse(line.slice(6)) as PipelineEvent;
        const stageMap: Record<string, keyof StageState> = {
          orchestrator: "orchestrator",
          literature_qc: "literature_qc",
          planner: "planner",
          critic: "critic",
        };

        if (event.stage in stageMap) {
          const key = stageMap[event.stage] as keyof StageState;

          if (event.status === "running") {
            stageStartRef.current[key] = Date.now();
            setStages((previous) => ({ ...previous, [key]: "running" }));
          } else if (event.status === "completed") {
            delete stageStartRef.current[key];
            setStages((previous) => ({ ...previous, [key]: "done" }));

            if (event.stage === "literature_qc" && event.data) {
              setQc(event.data as LiteratureQcSummary);
            }

            if (event.stage === "critic" && event.data) {
              setCritic(event.data as CriticSummary);
            }
          } else if (event.status === "failed") {
            delete stageStartRef.current[key];
            setStages((previous) => ({ ...previous, [key]: "failed" }));
            if (event.error) {
              setError(event.error);
            }
          }
        }

        if (event.stage === "error") {
          setError(event.error ?? "Pipeline failed");
        }
      }
    }

    const finalDetail = await loadDetail();
    hydrateFromDetail(finalDetail);
  }, [hydrateFromDetail, id, loadDetail, stopPolling]);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    loadDetail()
      .then(async (detail) => {
        hydrateFromDetail(detail);

        if (!detail.runId) {
          await startPipeline(detail.hypothesis);
          return;
        }

        if (detail.status === "running") {
          startPolling();
          return;
        }
      })
      .catch((loadError: unknown) => {
        setError(loadError instanceof Error ? loadError.message : String(loadError));
      });

    return () => stopPolling();
  }, [hydrateFromDetail, loadDetail, startPipeline, startPolling, stopPolling]);

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto">
      {hypothesis && (
        <div className="mb-6">
          <p className="text-xs font-mono text-[#64748B] uppercase tracking-wider mb-1">Hypothesis under analysis</p>
          <p className="text-[#4B5563] text-sm leading-relaxed italic">{hypothesis}</p>
        </div>
      )}

      {started && (
        <div className="mb-6 bg-white border border-[#E2E8F0] rounded-lg p-5 flex flex-col gap-3 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <p className="text-xs font-mono text-[#64748B] uppercase tracking-wider">Pipeline</p>
              <HelpInfoButton topicId="guide-status" label="Open pipeline status glossary" />
            </div>
            {isPollingExistingRun && (
              <span className="text-[11px] font-mono text-[#94A3B8]">following server state</span>
            )}
          </div>
          {(Object.keys(STAGE_LABELS) as Array<keyof StageState>).map((key) => (
            <div key={key} className="flex items-center justify-between">
              <span
                className="font-mono text-sm"
                title={getStatusMeaning(
                  stages[key] === "running"
                    ? "running"
                    : stages[key] === "failed"
                      ? "failed"
                      : stages[key] === "done"
                        ? "completed"
                        : "pending",
                  key,
                )}
                style={{
                  color:
                    stages[key] === "done" ? "#15803D"
                    : stages[key] === "running" ? "#B45309"
                    : stages[key] === "failed" ? "#B91C1C"
                    : "#94A3B8",
                }}
              >
                {STAGE_LABELS[key]}
              </span>
              <StageDot status={stages[key]} elapsed={elapsed[key]} />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="mb-6 bg-[#FFF5F5] border border-[#B91C1C] rounded-lg p-5">
          <p className="text-[#991B1B] text-sm font-mono mb-3">✗ {error}</p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => void startPipeline()}
              className="px-4 py-2 rounded text-sm font-mono transition-colors text-white"
              style={{ backgroundColor: "#B91C1C" }}
            >
              Retry pipeline
            </button>
            <Link
              href="/experiments/new"
              className="px-4 py-2 border border-[#B91C1C] text-[#B91C1C] rounded text-sm font-mono hover:bg-[#FFF5F5] transition-colors"
            >
              New Experiment
            </Link>
          </div>
        </div>
      )}

      {qc && (
        <div className="mb-6 bg-white border border-[#E2E8F0] rounded-lg p-5 flex flex-col gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <p className="text-xs font-mono text-[#64748B] uppercase tracking-wider">Literature QC</p>
            <HelpInfoButton topicId="guide-novelty" label="Open novelty guide" />
            <NoveltyBadge signal={qc.noveltySignal} />
          </div>
          <p className="text-[#4B5563] text-sm">{qc.rationale}</p>
          <p className="text-xs font-mono text-[#94A3B8]">
            Query: {qc.searchQuery} · {qc.referenceCount} reference{qc.referenceCount !== 1 ? "s" : ""} found
          </p>
          <p className="text-xs text-[#64748B] leading-relaxed">{getNoveltyProvenance(qc)}</p>
          {qc.references.slice(0, 3).map((reference, index) => (
            <div key={index} className="flex items-start gap-2 text-xs">
              <span className="text-[#94A3B8] shrink-0 font-mono">[{index + 1}]</span>
              <a href={reference.url} target="_blank" rel="noopener noreferrer" className="hover:underline" style={{ color: "#0D9488" }}>
                {reference.title}
              </a>
            </div>
          ))}
        </div>
      )}

      {!plan && !error && stages.planner === "done" && stages.critic === "running" && (
        <div className="mb-6 bg-white border border-[#E2E8F0] rounded-lg p-5">
          <p className="text-sm font-mono text-[#94A3B8] animate-pulse">
            ④ Internal QA is checking and refining the draft before Operon AI reveals it.
          </p>
        </div>
      )}

      {plan && critic && qc && (
        <div className="flex flex-col gap-4">
          <PlanSummaryCard
            title={plan.title}
            noveltySignal={qc.noveltySignal}
            confidenceScore={critic.confidenceScore}
            totalBudget={plan.totalBudgetEstimate}
            currency={plan.currency}
            timelinePhases={plan.timeline.length}
            protocolSteps={plan.protocol.length}
            summary={`Operon AI generated a ${plan.protocol.length}-step protocol grounded in ${plan.sources.length} sources, with materials from ${[...new Set(plan.materials.map((material) => material.supplier))].slice(0, 2).join(" and ")}.`}
          />
          {qualityNote && (
            <div className="bg-[#F0FDF4] border border-[#16A34A] rounded-lg p-4">
              <p className="text-[#166534] text-sm font-mono">{qualityNote}</p>
            </div>
          )}
          {plan.failureModes.length > 0 && (
            <div>
              <p className="text-xs font-mono text-[#64748B] uppercase tracking-wider mb-3">Known Failure Modes</p>
              <FailureModesPanel failureModes={plan.failureModes} compact maxItems={3} />
            </div>
          )}
          <button
            onClick={() => router.push(`/experiments/${id}/plan`)}
            className="w-full py-3 text-white rounded-lg font-mono text-sm transition-colors"
            style={{ backgroundColor: "#0D9488" }}
          >
            Open Full Plan →
          </button>
        </div>
      )}
    </div>
  );
}
