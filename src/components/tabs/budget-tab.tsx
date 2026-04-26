"use client";

import type { BudgetLine } from "@/lib/types";

export function BudgetTab({
  lines,
  total,
  currency,
}: {
  lines: BudgetLine[];
  total: number;
  currency: string;
}) {
  const grouped = lines.reduce<Record<string, BudgetLine[]>>((acc, l) => {
    (acc[l.category] ??= []).push(l);
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-1">
      {Object.entries(grouped).map(([category, items]) => (
        <div key={category}>
          <p className="text-xs font-mono text-[#64748B] uppercase tracking-wider pt-3 pb-1">
            {category}
          </p>
          {items.map((line, i) => (
            <div key={i} className="py-1.5 border-b border-[#F1F5F9] text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-[#4B5563]">{line.item}</span>
                <span className="font-mono text-[#111827] shrink-0">
                  {currency} {line.cost.toLocaleString()}
                </span>
              </div>
              {line.notes && (
                <p className="text-xs text-[#64748B] mt-1">{line.notes}</p>
              )}
            </div>
          ))}
        </div>
      ))}

      <div className="flex items-center justify-between pt-4 mt-2 border-t border-[#E2E8F0]">
        <span className="font-semibold text-[#111827] text-sm">Total</span>
        <span className="font-mono font-bold text-[#111827] text-base">
          {currency} {total.toLocaleString()}
        </span>
      </div>
    </div>
  );
}
