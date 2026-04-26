"use client";

import { getNoveltyMeaning } from "@/lib/help-content";
import type { NoveltySignal } from "@/lib/workflow-types";

const config: Record<
  NoveltySignal,
  { bg: string; fg: string; border: string; label: string; icon: string }
> = {
  not_found: {
    bg: "#F0FDF4",
    fg: "#15803D",
    border: "#16A34A",
    label: "NOT FOUND",
    icon: "✓",
  },
  similar_exists: {
    bg: "#FFFBEB",
    fg: "#92400E",
    border: "#B45309",
    label: "SIMILAR EXISTS",
    icon: "▲",
  },
  exact_match: {
    bg: "#FFF5F5",
    fg: "#991B1B",
    border: "#B91C1C",
    label: "EXACT MATCH",
    icon: "✗",
  },
};

export function NoveltyBadge({ signal }: { signal: NoveltySignal }) {
  const { bg, fg, border, label, icon } = config[signal];
  return (
    <span
      title={getNoveltyMeaning(signal)}
      style={{ backgroundColor: bg, color: fg, borderColor: border }}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-semibold border"
    >
      {label} {icon}
    </span>
  );
}
