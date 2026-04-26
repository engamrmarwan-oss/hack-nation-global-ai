"use client";

import type { FailureMode } from "@/lib/types";

export function FailureModesPanel({
  failureModes,
  compact = false,
  maxItems,
}: {
  failureModes: FailureMode[];
  compact?: boolean;
  maxItems?: number;
}) {
  if (failureModes.length === 0) {
    return (
      <div className="bg-[#141720] border border-[#2a2d3e] rounded-xl p-5">
        <p className="text-sm text-slate-500">
          Operon AI did not persist any experiment-specific failure modes for this record.
        </p>
      </div>
    );
  }

  const visibleModes = maxItems ? failureModes.slice(0, maxItems) : failureModes;
  const hiddenCount = failureModes.length - visibleModes.length;

  return (
    <div className="flex flex-col gap-4">
      {visibleModes.map((mode) => (
        <div
          key={`${mode.title}-${mode.sourceUrl}`}
          className={`bg-[#141720] border border-[#2a2d3e] rounded-xl ${compact ? "p-4" : "p-5"}`}
        >
          <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
            <div>
              <p className="text-[#f0f0f5] font-semibold text-sm">{mode.title}</p>
              <a
                href={mode.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-mono text-indigo-400 hover:underline break-all"
              >
                {mode.sourceTitle}
              </a>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <p className="text-xs font-mono text-slate-500 uppercase tracking-wider mb-1">
                Why It Fails
              </p>
              <p className="text-sm text-slate-300 leading-relaxed">{mode.whyItFails}</p>
            </div>
            <div>
              <p className="text-xs font-mono text-slate-500 uppercase tracking-wider mb-1">
                Signal To Watch
              </p>
              <p className="text-sm text-slate-300 leading-relaxed">{mode.signalToWatch}</p>
            </div>
            <div>
              <p className="text-xs font-mono text-slate-500 uppercase tracking-wider mb-1">
                Mitigation
              </p>
              <p className="text-sm text-slate-300 leading-relaxed">{mode.mitigation}</p>
            </div>
          </div>
        </div>
      ))}

      {hiddenCount > 0 && (
        <p className="text-xs font-mono text-slate-500">
          + {hiddenCount} more failure mode{hiddenCount === 1 ? "" : "s"} in the full plan view
        </p>
      )}
    </div>
  );
}
