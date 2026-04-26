"use client";

import type { TimelinePhase } from "@/lib/types";

export function TimelineTab({ phases }: { phases: TimelinePhase[] }) {
  return (
    <div className="flex flex-col gap-6">
      {phases.map((phase) => (
        <div key={phase.phase} className="flex gap-4">
          <div className="flex flex-col items-center gap-1 shrink-0">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-mono border"
              style={{ backgroundColor: "#F0FDFA", borderColor: "#0D9488", color: "#0A7A70" }}
            >
              {phase.phase}
            </div>
            {phase.phase < phases.length && (
              <div className="w-px flex-1 bg-[#E2E8F0] min-h-[1.5rem]" />
            )}
          </div>
          <div className="pb-4">
            <p className="text-[#111827] font-semibold text-sm">{phase.title}</p>
            <p className="text-xs font-mono text-[#64748B] mt-0.5">{phase.duration}</p>

            {phase.dependencies.length > 0 && (
              <div className="mt-2">
                <p className="text-xs font-mono text-[#94A3B8] mb-1">Dependencies</p>
                <ul className="flex flex-col gap-0.5">
                  {phase.dependencies.map((d, i) => (
                    <li key={i} className="text-xs text-[#64748B]">→ {d}</li>
                  ))}
                </ul>
              </div>
            )}

            {phase.milestones.length > 0 && (
              <div className="mt-2">
                <p className="text-xs font-mono text-[#94A3B8] mb-1">Milestones</p>
                <ul className="flex flex-col gap-0.5">
                  {phase.milestones.map((m, i) => (
                    <li key={i} className="text-xs text-[#4B5563]">· {m}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
