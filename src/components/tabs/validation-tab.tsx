"use client";

export function ValidationTab({ validationApproach }: { validationApproach: string }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg">
        <p className="text-xs font-mono text-[#64748B] uppercase tracking-wider mb-2">
          Validation Approach
        </p>
        <p className="text-[#4B5563] text-sm leading-relaxed">{validationApproach}</p>
      </div>
    </div>
  );
}
