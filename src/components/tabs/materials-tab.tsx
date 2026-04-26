"use client";

import type { Material } from "@/lib/types";

export function MaterialsTab({ materials }: { materials: Material[] }) {
  const subtotal = materials.reduce((sum, m) => sum + m.totalCost, 0);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left font-mono text-xs text-[#64748B] border-b border-[#E2E8F0]">
            <th className="pb-2 pr-4 font-medium">Name</th>
            <th className="pb-2 pr-4 font-medium">Supplier</th>
            <th className="pb-2 pr-4 font-medium">Cat #</th>
            <th className="pb-2 pr-4 font-medium">Qty</th>
            <th className="pb-2 pr-4 font-medium text-right">Unit</th>
            <th className="pb-2 font-medium text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {materials.map((m, i) => (
            <tr key={i} className="border-b border-[#F1F5F9]">
              <td className="py-2.5 pr-4 text-[#111827]">
                <div>{m.name}</div>
                {m.notes && <div className="text-xs text-[#64748B] mt-1">{m.notes}</div>}
              </td>
              <td className="py-2.5 pr-4 font-mono text-xs text-[#4B5563]">{m.supplier}</td>
              <td className="py-2.5 pr-4 font-mono text-xs" style={{ color: "#0D9488" }}>{m.catalogNumber}</td>
              <td className="py-2.5 pr-4 font-mono text-xs text-[#4B5563]">{m.quantity}</td>
              <td className="py-2.5 pr-4 font-mono text-xs text-[#4B5563] text-right">
                £{m.unitCost.toLocaleString()}
              </td>
              <td className="py-2.5 font-mono text-xs text-[#111827] font-medium text-right">
                £{m.totalCost.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-[#E2E8F0]">
            <td colSpan={5} className="pt-3 text-xs font-mono text-[#64748B]">
              Materials subtotal
            </td>
            <td className="pt-3 font-mono text-sm font-bold text-[#111827] text-right">
              £{subtotal.toLocaleString()}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
