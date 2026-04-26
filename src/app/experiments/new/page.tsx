"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { HelpInfoButton } from "@/components/help-info-button";
import type { IntakeAction, IntakeMessage, IntakeSessionState, PlanningBrief } from "@/lib/intake-types";

type IntakeSessionResponse = {
  id: string;
  state: IntakeSessionState;
};

const CORE_FIELD_LABELS: Record<keyof Pick<PlanningBrief, "intervention" | "modelSystem" | "primaryEndpoint" | "comparator">, string> = {
  intervention: "Intervention",
  modelSystem: "Model / system",
  primaryEndpoint: "Primary endpoint",
  comparator: "Comparator / control",
};

function BriefRow({ label, value }: { label: string; value: string | string[] }) {
  const isArray = Array.isArray(value);
  const displayValue = isArray ? value.join("; ") : value;

  return (
    <div className="border border-[#E2E8F0] rounded-lg p-3 bg-[#F8FAFC]">
      <p className="text-[11px] font-mono uppercase tracking-wider text-[#64748B] mb-1">{label}</p>
      <p className="text-sm text-[#111827] leading-relaxed">
        {displayValue && displayValue.length > 0 ? displayValue : "Still collecting"}
      </p>
    </div>
  );
}

function ActionButton({
  action,
  onInvoke,
  disabled,
}: {
  action: IntakeAction;
  onInvoke: (action: IntakeAction) => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onInvoke(action)}
      disabled={disabled}
      className="px-3 py-2 rounded-full border border-[#0D9488] text-[#0D9488] text-xs font-mono hover:bg-[#F0FDFA] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {action.label}
    </button>
  );
}

export default function NewExperimentPage() {
  const router = useRouter();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [session, setSession] = useState<IntakeSessionState | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadNewSession = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/intake/sessions", {
        method: "POST",
      });

      const data = (await response.json()) as IntakeSessionResponse | { error?: string };
      if (!response.ok || !("id" in data)) {
        throw new Error(("error" in data && data.error) || "Failed to start intake chat.");
      }

      setSessionId(data.id);
      setSession(data.state);
      setInput("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadNewSession();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadNewSession]);

  const sendTurn = useCallback(
    async (payload: { message?: string; action?: "accept_assumptions" | "skip_assumptions" }) => {
      if (!sessionId) {
        return;
      }

      setSending(true);
      setError(null);

      try {
        const response = await fetch(`/api/intake/sessions/${sessionId}/message`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = (await response.json()) as IntakeSessionResponse | { error?: string; state?: IntakeSessionState };
        if (!response.ok || !("state" in data) || !data.state) {
          throw new Error(("error" in data && data.error) || "Failed to continue the chat.");
        }

        setSession(data.state);
        setInput("");
      } catch (sendError) {
        setError(sendError instanceof Error ? sendError.message : String(sendError));
      } finally {
        setSending(false);
      }
    },
    [sessionId],
  );

  const handleSubmit = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || sending) {
      return;
    }

    await sendTurn({ message: trimmed });
  }, [input, sendTurn, sending]);

  const handleAction = useCallback(
    async (action: IntakeAction) => {
      if (action.type === "quick_reply" && action.message) {
        await sendTurn({ message: action.message });
        return;
      }

      if (action.type === "accept_assumptions" || action.type === "skip_assumptions") {
        await sendTurn({ action: action.type });
        return;
      }

      if (action.type === "confirm_hypothesis" && sessionId) {
        setConfirming(true);
        setError(null);

        try {
          const response = await fetch(`/api/intake/sessions/${sessionId}/confirm`, {
            method: "POST",
          });

          const data = (await response.json()) as { id?: string; error?: string };
          if (!response.ok || !data.id) {
            throw new Error(data.error ?? "Failed to create experiment.");
          }

          router.push(`/experiments/${data.id}/pipeline`);
        } catch (confirmError) {
          setError(confirmError instanceof Error ? confirmError.message : String(confirmError));
        } finally {
          setConfirming(false);
        }
      }
    },
    [router, sendTurn, sessionId],
  );

  const latestAssistantMessage = useMemo(() => {
    const assistantMessages = session?.messages.filter((message) => message.role === "assistant") ?? [];
    return assistantMessages[assistantMessages.length - 1] ?? null;
  }, [session]);

  if (loading) {
    return (
      <div className="px-6 py-8 max-w-5xl mx-auto">
        <p className="font-mono text-[#94A3B8] animate-pulse">Starting Operon AI intake…</p>
      </div>
    );
  }

  return (
    <div className="px-6 py-8 max-w-5xl mx-auto">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <h1
              className="text-2xl font-bold text-[#111827]"
              style={{ fontFamily: "var(--font-serif)", letterSpacing: "-0.02em" }}
            >
              Conversational Intake
            </h1>
            <HelpInfoButton topicId="guide-how-to-use" label="Open intake guide" />
          </div>
          <p className="text-[#4B5563] text-sm leading-relaxed max-w-3xl">
            Describe the experiment idea naturally. Operon AI will keep asking follow-ups until it has enough structured detail to build a credible plan.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadNewSession()}
          className="shrink-0 px-4 py-2 rounded-lg border border-[#CBD5E1] text-sm font-mono text-[#475569] hover:bg-white transition-colors"
        >
          Start over
        </button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="bg-white border border-[#E2E8F0] rounded-lg shadow-sm min-h-[620px] flex flex-col">
          <div className="px-6 py-5 border-b border-[#E2E8F0]">
            <p className="text-xs font-mono text-[#64748B] uppercase tracking-wider">Intake Chat</p>
            <p className="text-sm text-[#4B5563] mt-1">
              Freeform chat first. Operon AI tracks the planning brief in the backend and asks for missing core inputs only when needed.
            </p>
          </div>

          <div className="flex-1 px-6 py-5 flex flex-col gap-4 overflow-y-auto">
            {session?.messages.map((message: IntakeMessage) => (
              <div
                key={message.id}
                className={`flex ${message.role === "assistant" ? "justify-start" : "justify-end"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                    message.role === "assistant"
                      ? "bg-[#F0FDFA] border border-[#99F6E4] rounded-bl-md"
                      : "bg-[#0D1B2E] text-white rounded-br-md"
                  }`}
                >
                  <p
                    className={`text-xs font-mono uppercase tracking-wider mb-1 ${
                      message.role === "assistant" ? "text-[#0A7A70]" : "text-[#7DD3FC]"
                    }`}
                  >
                    {message.role === "assistant" ? "Operon AI" : "Scientist"}
                  </p>
                  <p className={`text-sm leading-relaxed whitespace-pre-wrap ${message.role === "assistant" ? "text-[#111827]" : "text-white"}`}>
                    {message.content}
                  </p>

                  {message.role === "assistant" && latestAssistantMessage?.id === message.id && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {message.quickReplies?.map((reply) => (
                        <button
                          key={reply.label}
                          type="button"
                          onClick={() => void sendTurn({ message: reply.message })}
                          disabled={sending || confirming}
                          className="px-3 py-2 rounded-full border border-[#0D9488] text-[#0D9488] text-xs font-mono hover:bg-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {reply.label}
                        </button>
                      ))}
                      {message.actions?.map((action) => (
                        <ActionButton
                          key={action.label}
                          action={action}
                          onInvoke={(nextAction) => void handleAction(nextAction)}
                          disabled={sending || confirming}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {error && (
              <div className="bg-[#FFF5F5] border border-[#B91C1C] rounded-lg p-4">
                <p className="text-[#991B1B] text-sm font-mono">✗ {error}</p>
              </div>
            )}
          </div>

          <div className="px-6 py-5 border-t border-[#E2E8F0] bg-[#F8FAFC]">
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="sr-only" htmlFor="intake-message">
                  Chat message
                </label>
                <textarea
                  id="intake-message"
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="Add details, clarify a field, or correct something Operon AI inferred."
                  rows={3}
                  disabled={sending || confirming}
                  className="w-full rounded-xl border border-[#CBD5E1] bg-white px-4 py-3 text-sm text-[#111827] placeholder:text-[#94A3B8] focus:border-[#0D9488] focus:outline-none resize-none"
                  onKeyDown={(event) => {
                    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                      event.preventDefault();
                      void handleSubmit();
                    }
                  }}
                />
                <p className="mt-2 text-[11px] font-mono text-[#94A3B8]">
                  Press Ctrl/Cmd + Enter to send.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={!input.trim() || sending || confirming}
                className="px-5 py-3 rounded-lg bg-[#0D9488] text-white text-sm font-mono hover:bg-[#0F766E] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {sending ? "Sending…" : confirming ? "Starting…" : "Send"}
              </button>
            </div>
          </div>
        </section>

        <aside className="flex flex-col gap-4">
          <section className="bg-white border border-[#E2E8F0] rounded-lg p-5 shadow-sm">
            <p className="text-xs font-mono text-[#64748B] uppercase tracking-wider mb-3">Planning Brief</p>
            {session && (
              <div className="flex flex-col gap-3">
                <BriefRow label="Intervention" value={session.planningBrief.intervention} />
                <BriefRow label="Model / system" value={session.planningBrief.modelSystem} />
                <BriefRow label="Primary endpoint" value={session.planningBrief.primaryEndpoint} />
                <BriefRow label="Comparator / control" value={session.planningBrief.comparator} />
                <BriefRow label="Threshold" value={session.planningBrief.threshold} />
                <BriefRow label="Mechanism" value={session.planningBrief.mechanism} />
                <BriefRow label="Claim constraints" value={session.planningBrief.claimConstraints} />
                <BriefRow label="Confirmed assumptions" value={session.planningBrief.confirmedAssumptions} />
              </div>
            )}
          </section>

          <section className="bg-white border border-[#E2E8F0] rounded-lg p-5 shadow-sm">
            <p className="text-xs font-mono text-[#64748B] uppercase tracking-wider mb-3">Readiness</p>
            {session && session.missingCoreFields.length > 0 ? (
              <div className="flex flex-col gap-2">
                <p className="text-sm text-[#4B5563] leading-relaxed">
                  Operon AI still needs these core planning inputs before analysis can begin:
                </p>
                {session.missingCoreFields.map((field) => (
                  <span
                    key={field}
                    className="inline-flex self-start px-2.5 py-1 rounded-full bg-[#FFF7ED] border border-[#FDBA74] text-[#9A3412] text-xs font-mono"
                  >
                    {CORE_FIELD_LABELS[field]}
                  </span>
                ))}
              </div>
            ) : session?.readyToSynthesize && session.synthesizedHypothesis ? (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-[#166534] leading-relaxed">
                  Intake is sufficient. Operon AI has a confirmed planning brief and a synthesized hypothesis preview ready for analysis.
                </p>
                <div className="rounded-lg border border-[#BBF7D0] bg-[#F0FDF4] p-4">
                  <p className="text-[11px] font-mono uppercase tracking-wider text-[#15803D] mb-2">
                    Hypothesis Preview
                  </p>
                  <p className="text-sm text-[#166534] leading-relaxed">{session.synthesizedHypothesis}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-[#4B5563] leading-relaxed">
                Operon AI is still resolving optional assumptions before it exposes the final hypothesis preview.
              </p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
