"use client";

function focusHelpTopic(topicId: string) {
  window.dispatchEvent(new CustomEvent("operon-help-focus", { detail: { topicId } }));
}

export function HelpInfoButton({
  topicId,
  label,
}: {
  topicId: string;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={() => focusHelpTopic(topicId)}
      className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-[#CBD5E1] text-[10px] font-mono text-[#64748B] hover:border-[#0D9488] hover:text-[#0D9488] transition-colors"
    >
      i
    </button>
  );
}
