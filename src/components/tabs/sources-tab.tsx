"use client";

import type { Source } from "@/lib/types";

const typeStyle: Record<Source["type"], { bg: string; fg: string; border: string }> = {
  protocol: { bg: "#F0FDFA", fg: "#0A7A70", border: "#0D9488" },
  paper:    { bg: "#F0FDF4", fg: "#15803D", border: "#16A34A" },
  supplier: { bg: "#FFFBEB", fg: "#92400E", border: "#B45309" },
};

export function SourcesTab({ sources }: { sources: Source[] }) {
  if (sources.length === 0) {
    return <p className="text-[#64748B] text-sm">No sources recorded.</p>;
  }

  return (
    <div className="flex flex-col gap-1">
      {sources.map((s, i) => (
        <div key={i} className="flex items-center gap-3 py-2.5 border-b border-[#F1F5F9]">
          <span
            className="text-xs font-mono px-2 py-0.5 rounded border shrink-0"
            style={{
              backgroundColor: typeStyle[s.type].bg,
              color: typeStyle[s.type].fg,
              borderColor: typeStyle[s.type].border,
            }}
          >
            {s.type}
          </span>
          <a
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm hover:underline truncate"
            style={{ color: "#0D9488" }}
          >
            {s.title}
          </a>
        </div>
      ))}
    </div>
  );
}
