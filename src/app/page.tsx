import Link from "next/link";
import { HelpInfoButton } from "@/components/help-info-button";
import { NoveltyBadge } from "@/components/novelty-badge";
import { getStatusMeaning } from "@/lib/help-content";
import type { NoveltySignal } from "@/lib/workflow-types";
import { listExperiments } from "@/lib/experiment-data";
import type { ExperimentListItem } from "@/lib/types";

function StatusBadge({ status, stage }: { status: string; stage: string | null }) {
  const isRunning = status === "running";
  const isDone = status === "completed";
  const isFailed = status === "failed";

  const style = isRunning
    ? { bg: "#FFFBEB", fg: "#92400E", border: "#B45309", label: stage ?? "running" }
    : isDone
        ? { bg: "#F0FDF4", fg: "#15803D", border: "#16A34A", label: "done" }
        : isFailed
          ? { bg: "#FFF5F5", fg: "#991B1B", border: "#B91C1C", label: "failed" }
          : { bg: "#F8FAFC", fg: "#64748B", border: "#CBD5E1", label: status };

  return (
    <span
      title={getStatusMeaning(status, stage)}
      className="font-mono text-xs px-2 py-0.5 rounded border"
      style={{ backgroundColor: style.bg, color: style.fg, borderColor: style.border }}
    >
      {style.label}
    </span>
  );
}

export default async function DashboardPage() {
  let experiments: ExperimentListItem[] = [];
  let fetchError: string | null = null;

  try {
    experiments = await listExperiments();
  } catch (error) {
    fetchError = error instanceof Error ? error.message : "Failed to load saved experiments.";
  }

  return (
    <div className="px-6 py-8 max-w-5xl mx-auto">
      {/* Hero */}
      <div className="mb-8">
        <h1
          className="text-2xl font-bold text-[#111827] mb-1"
          style={{ fontFamily: "var(--font-serif)", letterSpacing: "-0.02em" }}
        >
          Operon AI Experiments
        </h1>
        <p className="text-[#4B5563] text-sm">
          Generate grounded, lab-executable plans from scientific hypotheses.
        </p>
      </div>

      {/* Error banner */}
      {fetchError && (
        <div className="mb-6 p-4 bg-[#FFF5F5] border border-[#B91C1C] rounded-lg">
          <p className="text-[#991B1B] text-sm font-mono">Unable to load experiments: {fetchError}</p>
        </div>
      )}

      {/* Table */}
      <section>
        <h2 className="font-mono text-xs text-[#64748B] uppercase tracking-wider mb-3">
          Past Experiments
        </h2>

        {experiments.length === 0 && !fetchError ? (
          <div className="bg-white border border-dashed border-[#CBD5E1] rounded-lg p-10 text-center">
            <p className="text-[#94A3B8] text-sm font-mono mb-4">
              No experiments yet — start one from the sidebar
            </p>
            <Link
              href="/experiments/new"
              className="inline-block px-5 py-2.5 text-white rounded text-sm font-medium transition-colors"
              style={{ backgroundColor: "#0D9488" }}
            >
              Start New Experiment
            </Link>
          </div>
        ) : (
          <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden shadow-sm">
            <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-5 py-2.5 border-b border-[#E2E8F0] text-xs font-mono text-[#64748B] uppercase tracking-wider bg-[#F8FAFC]">
              <span>Hypothesis</span>
              <span className="inline-flex items-center gap-1.5">
                Novelty
                <HelpInfoButton topicId="guide-novelty" label="Open novelty guide" />
              </span>
              <span className="inline-flex items-center gap-1.5">
                Score
                <HelpInfoButton topicId="guide-score" label="Open score guide" />
              </span>
              <span className="inline-flex items-center gap-1.5">
                Status
                <HelpInfoButton topicId="guide-status" label="Open status glossary" />
              </span>
              <span>Date</span>
            </div>

            {experiments.map((exp) => {
              const href = exp.status === "completed"
                ? `/experiments/${exp.id}/plan`
                : `/experiments/${exp.id}/pipeline`;

              return (
                <Link
                  key={exp.id}
                  href={href}
                  className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 items-center px-5 py-3.5 border-b border-[#F1F5F9] hover:bg-[#F8FAFC] transition-colors last:border-b-0"
                >
                  <span className="text-[#111827] text-sm truncate pr-2">
                    {exp.hypothesis.length > 90
                      ? exp.hypothesis.slice(0, 90) + "…"
                      : exp.hypothesis}
                  </span>

                  <span>
                    {exp.noveltySignal ? (
                      <NoveltyBadge signal={exp.noveltySignal as NoveltySignal} />
                    ) : (
                      <span className="text-[#CBD5E1] font-mono text-xs">—</span>
                    )}
                  </span>

                  <span className="font-mono text-sm text-[#4B5563] text-right">
                    {exp.confidenceScore !== null ? `${exp.confidenceScore}` : "—"}
                  </span>

                  <StatusBadge status={exp.status} stage={exp.stage} />

                  <span className="font-mono text-xs text-[#64748B] whitespace-nowrap">
                    {new Date(exp.createdAt).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
