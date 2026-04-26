// Created: 2026-04-26

"use client";

import { useCallback, useMemo, useState } from "react";
import type {
  ReviewChatAction,
  ReviewChatMessage,
  ReviewChatSessionState,
} from "@/lib/review-types";

type ReviewSessionResponse = {
  id: string;
  state: ReviewChatSessionState;
};

function ReviewActionButton({
  action,
  disabled,
  onClick,
}: {
  action: ReviewChatAction;
  disabled: boolean;
  onClick: (action: ReviewChatAction) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(action)}
      disabled={disabled}
      className="px-3 py-2 rounded-full border border-[#0D9488] text-[#0D9488] text-xs font-mono hover:bg-[#F0FDFA] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {action.label}
    </button>
  );
}

function ChatBubbleIcon() {
  return (
    <svg
      aria-hidden="true"
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      className="shrink-0"
    >
      <path
        d="M3 3.75C3 2.78 3.78 2 4.75 2h6.5C12.22 2 13 2.78 13 3.75v4.5C13 9.22 12.22 10 11.25 10H7.2L4.7 12.05c-.57.47-1.4.06-1.4-.68V10.8C3.12 10.53 3 10.15 3 9.75v-6Z"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M5.4 5.5h5.2M5.4 7.3h3.4" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
    </svg>
  );
}

export function ReviewChatBubble({ experimentId }: { experimentId: string }) {
  const [open, setOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [session, setSession] = useState<ReviewChatSessionState | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedCount, setSavedCount] = useState<number | null>(null);

  const latestAssistantMessage = useMemo(() => {
    const assistantMessages = session?.messages.filter((message) => message.role === "assistant") ?? [];
    return assistantMessages[assistantMessages.length - 1] ?? null;
  }, [session]);

  const loadSession = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/review/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ experimentId }),
      });

      const data = (await response.json()) as ReviewSessionResponse | { error?: string };
      if (!response.ok || !("id" in data)) {
        throw new Error(("error" in data && data.error) || "Failed to open review chat.");
      }

      setSessionId(data.id);
      setSession(data.state);
      setSavedCount(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setLoading(false);
    }
  }, [experimentId]);

  const ensureOpenSession = useCallback(async () => {
    if (sessionId && session) {
      return;
    }

    await loadSession();
  }, [loadSession, session, sessionId]);

  const sendMessage = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || !sessionId) {
      return;
    }

    setSending(true);
    setError(null);

    try {
      const response = await fetch(`/api/review/sessions/${sessionId}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });

      const data = (await response.json()) as ReviewSessionResponse | { error?: string; state?: ReviewChatSessionState };
      if (!response.ok || !("state" in data) || !data.state) {
        throw new Error(("error" in data && data.error) || "Failed to save review message.");
      }

      setSession(data.state);
      setInput("");
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : String(sendError));
    } finally {
      setSending(false);
    }
  }, [input, sessionId]);

  const confirmCorrections = useCallback(async () => {
    if (!sessionId) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/review/sessions/${sessionId}/confirm`, {
        method: "POST",
      });

      const data = (await response.json()) as {
        error?: string;
        correctionCount?: number;
        state?: ReviewChatSessionState;
      };

      if (!response.ok || !data.state || typeof data.correctionCount !== "number") {
        throw new Error(data.error ?? "Failed to save scientist corrections.");
      }

      setSession(data.state);
      setSavedCount(data.correctionCount);
    } catch (confirmError) {
      setError(confirmError instanceof Error ? confirmError.message : String(confirmError));
    } finally {
      setSaving(false);
    }
  }, [sessionId]);

  return (
    <>
      <button
        type="button"
        onClick={async () => {
          const nextOpen = !open;
          setOpen(nextOpen);
          if (nextOpen) {
            await ensureOpenSession();
          }
        }}
        className="fixed right-[120px] bottom-4 xl:right-[344px] z-30 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#0D9488] text-white text-sm font-mono shadow-lg hover:bg-[#0F766E] transition-colors"
      >
        <ChatBubbleIcon />
        <span>{open ? "Close review" : "Review plan"}</span>
      </button>

      {open && (
        <div className="fixed right-4 bottom-20 xl:right-[344px] z-30 w-[min(92vw,420px)] bg-white border border-[#E2E8F0] rounded-2xl shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#E2E8F0] bg-[#F8FAFC]">
            <div>
              <p className="text-sm font-semibold text-[#111827]">Scientist Review Chat</p>
              <p className="text-[11px] font-mono text-[#64748B]">Feedback becomes reusable expert memory</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-sm font-mono text-[#64748B] hover:text-[#111827]"
            >
              Close
            </button>
          </div>

          <div className="h-[420px] overflow-y-auto px-4 py-4 flex flex-col gap-4">
            {loading && (
              <p className="text-sm font-mono text-[#94A3B8] animate-pulse">Opening review chat…</p>
            )}

            {session?.messages.map((message: ReviewChatMessage) => (
              <div
                key={message.id}
                className={`flex ${message.role === "assistant" ? "justify-start" : "justify-end"}`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl px-4 py-3 ${
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
                      {message.actions?.map((action) => (
                        <ReviewActionButton
                          key={action.label}
                          action={action}
                          disabled={saving || sending}
                          onClick={(nextAction) => {
                            if (nextAction.type === "confirm_corrections") {
                              void confirmCorrections();
                            }
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {session?.readyToConfirm && session.pendingCorrections.length > 0 && (
              <div className="border border-[#CBD5E1] rounded-xl p-3 bg-[#F8FAFC]">
                <p className="text-xs font-mono text-[#64748B] uppercase tracking-wider mb-3">Corrections Ready To Save</p>
                <div className="flex flex-col gap-3">
                  {session.pendingCorrections.map((correction, index) => (
                    <div key={`${correction.section}-${index}`} className="bg-white border border-[#E2E8F0] rounded-lg p-3">
                      <p className="text-[11px] font-mono text-[#0D9488] uppercase tracking-wider mb-1">
                        {correction.section}
                      </p>
                      <p className="text-xs text-[#64748B] mb-1">From: {correction.originalText}</p>
                      <p className="text-sm text-[#111827] mb-1">To: {correction.correctedText}</p>
                      <p className="text-xs text-[#4B5563]">{correction.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {savedCount !== null && (
              <div className="border border-[#16A34A] bg-[#F0FDF4] rounded-xl p-3">
                <p className="text-sm font-mono text-[#166534]">
                  Saved {savedCount} correction{savedCount === 1 ? "" : "s"}.
                </p>
                <p className="text-xs text-[#166534] mt-1">
                  Future similar plans will reuse this expert feedback automatically.
                </p>
              </div>
            )}

            {error && (
              <div className="border border-[#B91C1C] bg-[#FFF5F5] rounded-xl p-3">
                <p className="text-sm font-mono text-[#991B1B]">✗ {error}</p>
              </div>
            )}
          </div>

          <div className="border-t border-[#E2E8F0] px-4 py-3 bg-white">
            <div className="flex flex-col gap-3">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                rows={3}
                placeholder="Example: In protocol step 4, the FITC-dextran dose should be 440 mg/kg instead of 600 mg/kg because the current dose overstates the validated assay range."
                className="w-full rounded-xl border border-[#CBD5E1] px-3 py-2 text-sm text-[#111827] resize-none focus:outline-none"
                style={{ outlineColor: "#0D9488" }}
                disabled={loading || sending || saving}
              />
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={async () => {
                    setSession(null);
                    setSessionId(null);
                    setSavedCount(null);
                    await loadSession();
                  }}
                  className="text-xs font-mono text-[#64748B] hover:text-[#111827]"
                  disabled={loading || sending || saving}
                >
                  New review
                </button>
                <button
                  type="button"
                  onClick={() => void sendMessage()}
                  disabled={!input.trim() || loading || sending || saving || !sessionId}
                  className="px-4 py-2 rounded-lg bg-[#0D9488] text-white text-sm font-mono disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {sending ? "Sending…" : "Send"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
