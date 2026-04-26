"use client";

import type { ProtocolStep } from "@/lib/types";

export function ProtocolTab({ steps }: { steps: ProtocolStep[] }) {
  return (
    <div className="flex flex-col gap-6">
      {steps.map((step) => (
        <div key={step.stepNumber} className="flex gap-4">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono shrink-0 mt-0.5 border"
            style={{ backgroundColor: "#F0FDFA", borderColor: "#0D9488", color: "#0A7A70" }}
          >
            {step.stepNumber}
          </div>
          <div className="flex flex-col gap-1 flex-1">
            <p className="text-[#111827] font-semibold text-sm">{step.title}</p>
            <p className="text-[#4B5563] text-sm leading-relaxed">{step.description}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
              <span className="text-xs font-mono text-[#64748B]">Duration: {step.duration}</span>
              {step.sourceUrl && (
                <a
                  href={step.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-mono hover:underline"
                  style={{ color: "#0D9488" }}
                >
                  ↗ {step.sourceProtocol ?? step.sourceUrl}
                </a>
              )}
            </div>
            {step.criticalNote && (
              <p className="text-xs font-mono text-[#B45309] mt-0.5">⚠ {step.criticalNote}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
