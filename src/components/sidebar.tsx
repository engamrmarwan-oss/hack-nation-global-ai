import Link from "next/link";
import { Logo } from "./logo";
import { listExperiments } from "@/lib/experiment-data";
import { getStatusMeaning } from "@/lib/help-content";
import type { ExperimentListItem } from "@/lib/types";

function SidebarStatusDot({ status }: { status: ExperimentListItem["status"] }) {
  const color =
    status === "completed"
      ? "bg-[#16A34A]"
      : status === "running"
        ? "bg-[#B45309] animate-pulse"
        : status === "failed"
          ? "bg-[#B91C1C]"
          : "bg-[#475569]";
  return (
    <span
      title={getStatusMeaning(status)}
      className={`w-1.5 h-1.5 rounded-full shrink-0 inline-block ${color}`}
    />
  );
}

export async function Sidebar() {
  let experiments: ExperimentListItem[] = [];
  try {
    experiments = await listExperiments();
  } catch {
    // sidebar is non-blocking — render without experiments if DB unavailable
  }

  const recent = experiments.slice(0, 6);

  return (
    <aside
      className="w-[240px] shrink-0 min-h-screen flex flex-col"
      style={{ backgroundColor: "#0D1B2E" }}
    >
      {/* Logo */}
      <div className="px-5 pt-6 pb-4 border-b border-[#1E4470]">
        <Link href="/" aria-label="Dashboard">
          <Logo />
        </Link>
      </div>

      {/* New Experiment CTA */}
      <div className="px-4 pt-5">
        <Link
          href="/experiments/new"
          className="sidebar-cta flex items-center justify-center gap-2 w-full py-2.5 rounded-md text-sm font-medium text-white transition-colors"
        >
          + New Experiment
        </Link>
      </div>

      {/* Navigation */}
      <nav className="px-4 mt-6">
        <p className="text-[9px] font-medium tracking-widest uppercase text-[#475569] mb-2 px-1">
          Workspace
        </p>
        <Link
          href="/"
          className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm hover:bg-[#112240] transition-colors"
          style={{ color: "#E8EDF4" }}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M2 2h5v5H2V2zm0 7h5v5H2V9zm7-7h5v5H9V2zm0 7h5v5H9V9z" />
          </svg>
          All Experiments
        </Link>
      </nav>

      {/* Recent Experiments */}
      {recent.length > 0 && (
        <div className="px-4 mt-6 flex-1">
          <p className="text-[9px] font-medium tracking-widest uppercase text-[#475569] mb-2 px-1">
            Recent
          </p>
          <ul className="flex flex-col gap-0.5">
            {recent.map((exp) => {
              const href = exp.status === "completed"
                ? `/experiments/${exp.id}/plan`
                : `/experiments/${exp.id}/pipeline`;
              return (
                <li key={exp.id}>
                  <Link
                    href={href}
                    className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-[#112240] transition-colors group"
                  >
                    <SidebarStatusDot status={exp.status} />
                    <span className="text-xs text-[#94A3B8] group-hover:text-[#E8EDF4] truncate transition-colors leading-snug">
                      {exp.hypothesis.length > 36
                        ? exp.hypothesis.slice(0, 36) + "…"
                        : exp.hypothesis}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Footer */}
      <div className="px-5 py-4 border-t border-[#1E4470] mt-auto">
        <p className="text-[10px] text-[#475569] font-mono">Operon AI · AI Scientist demo</p>
      </div>
    </aside>
  );
}
