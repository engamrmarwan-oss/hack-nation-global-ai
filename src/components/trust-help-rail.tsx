"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import {
  CRITIC_SCORE_GUIDE,
  HOW_TO_USE_STEPS,
  NOVELTY_INDEX,
  STATUS_GLOSSARY,
} from "@/lib/help-content";

function HelpContent({ pathname }: { pathname: string }) {
  const pageLead = useMemo(() => {
    if (pathname === "/experiments/new") {
      return "Use the backend conversation to gather the minimum scientific ingredients before Operon AI synthesizes the hypothesis and confirms the planning brief.";
    }

    if (pathname.endsWith("/pipeline")) {
      return "Watch the pipeline in order: intake confirmation, literature QC, evidence retrieval, plan generation, then internal QA.";
    }

    if (pathname.endsWith("/plan")) {
      return "Treat the plan view as a review surface: inspect protocol realism, supply chain details, validation fit, and failure modes before execution.";
    }

    return "Use the dashboard to monitor novelty, critic score, and lifecycle status across saved Operon AI experiments.";
  }, [pathname]);

  return (
    <div className="flex flex-col gap-5">
      <section id="guide-how-to-use" className="bg-white border border-[#E2E8F0] rounded-lg p-4 shadow-sm">
        <p className="text-xs font-mono text-[#64748B] uppercase tracking-wider mb-2">
          How To Use Operon AI
        </p>
        <p className="text-sm text-[#4B5563] leading-relaxed mb-3">{pageLead}</p>
        <div className="flex flex-col gap-2">
          {HOW_TO_USE_STEPS.map((step, index) => (
            <p key={step} className="text-sm text-[#4B5563] leading-relaxed">
              <span className="font-mono text-[#0D9488] mr-2">{index + 1}.</span>
              {step}
            </p>
          ))}
        </div>
      </section>

      <section id="guide-status" className="bg-white border border-[#E2E8F0] rounded-lg p-4 shadow-sm">
        <p className="text-xs font-mono text-[#64748B] uppercase tracking-wider mb-3">
          Status Glossary
        </p>
        <div className="flex flex-col gap-3">
          {Object.entries(STATUS_GLOSSARY).map(([status, description]) => (
            <div key={status}>
              <p className="text-xs font-mono text-[#111827] uppercase tracking-wider">{status.replaceAll("_", " ")}</p>
              <p className="text-sm text-[#4B5563] leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="guide-score" className="bg-white border border-[#E2E8F0] rounded-lg p-4 shadow-sm">
        <p className="text-xs font-mono text-[#64748B] uppercase tracking-wider mb-3">
          Quality Score
        </p>
        <div className="flex flex-col gap-2">
          {CRITIC_SCORE_GUIDE.map((guide) => (
            <p key={guide} className="text-sm text-[#4B5563] leading-relaxed">
              {guide}
            </p>
          ))}
        </div>
      </section>

      <section id="guide-novelty" className="bg-white border border-[#E2E8F0] rounded-lg p-4 shadow-sm">
        <p className="text-xs font-mono text-[#64748B] uppercase tracking-wider mb-3">
          Novelty States
        </p>
        <div className="flex flex-col gap-3">
          {Object.entries(NOVELTY_INDEX).map(([signal, description]) => (
            <div key={signal}>
              <p className="text-xs font-mono text-[#111827] uppercase tracking-wider">{signal.replaceAll("_", " ")}</p>
              <p className="text-sm text-[#4B5563] leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export function TrustHelpRail() {
  const pathname = usePathname();
  const [desktopOpen, setDesktopOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    function handleFocus(event: Event) {
      const topicId = (event as CustomEvent<{ topicId?: string }>).detail?.topicId;
      if (!topicId) {
        return;
      }

      if (window.matchMedia("(min-width: 1280px)").matches) {
        setDesktopOpen(true);
      } else {
        setMobileOpen(true);
      }

      window.setTimeout(() => {
        document.getElementById(topicId)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    }

    window.addEventListener("operon-help-focus", handleFocus);
    return () => {
      window.removeEventListener("operon-help-focus", handleFocus);
    };
  }, []);

  return (
    <>
      <div className="hidden xl:flex shrink-0">
        {desktopOpen ? (
          <aside className="w-[320px] border-l border-[#E2E8F0] bg-[#F8FAFC]">
            <div className="sticky top-0 h-screen overflow-y-auto">
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2E8F0] bg-white">
                <p className="text-sm font-semibold text-[#111827]">Operon AI Guide</p>
                <button
                  type="button"
                  onClick={() => setDesktopOpen(false)}
                  className="text-sm font-mono text-[#64748B] hover:text-[#111827]"
                >
                  Close
                </button>
              </div>
              <div className="px-5 py-5">
                <HelpContent pathname={pathname} />
              </div>
            </div>
          </aside>
        ) : (
          <aside className="w-[84px] border-l border-[#E2E8F0] bg-[#F8FAFC]">
            <div className="sticky top-0 h-screen flex items-start justify-center pt-6">
              <button
                type="button"
                onClick={() => setDesktopOpen(true)}
                className="px-3 py-2 rounded-full bg-[#0D9488] text-white text-sm font-mono shadow-sm"
              >
                Guide
              </button>
            </div>
          </aside>
        )}
      </div>

      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="xl:hidden fixed right-4 bottom-4 z-30 px-4 py-2 rounded-full bg-[#0D9488] text-white text-sm font-mono shadow-lg"
      >
        Guide
      </button>

      {mobileOpen && (
        <div className="xl:hidden fixed inset-0 z-40 bg-[#0D1B2E]/35">
          <div className="absolute right-0 top-0 h-full w-full max-w-[360px] bg-[#F8FAFC] border-l border-[#E2E8F0] shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2E8F0] bg-white">
              <p className="text-sm font-semibold text-[#111827]">Operon AI Guide</p>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="text-sm font-mono text-[#64748B] hover:text-[#111827]"
              >
                Close
              </button>
            </div>
            <div className="h-[calc(100%-57px)] overflow-y-auto px-5 py-5">
              <HelpContent pathname={pathname} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
