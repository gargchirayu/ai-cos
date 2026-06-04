import { Clock, RefreshCw } from "lucide-react";
import type { Tab } from "../types";
import { formatMorning, formatTime } from "../lib";

export interface TabCounts {
  decide: number;
  delegate: number;
  flags: number;
  review: number;
  others: number;
}

const TABS: {
  id: Tab;
  label: string;
  countKey: keyof TabCounts | null;
  inactive: string;
  active: string;
}[] = [
  {
    id: "brief",
    label: "Brief",
    countKey: null,
    inactive: "bg-indigo-50 text-indigo-600 hover:bg-indigo-100",
    active: "bg-indigo-100 text-indigo-800 font-semibold ring-1 ring-indigo-200 shadow-sm",
  },
  {
    id: "flags",
    label: "Flags",
    countKey: "flags",
    inactive: "bg-amber-50 text-amber-600 hover:bg-amber-100",
    active: "bg-amber-100 text-amber-800 font-semibold ring-1 ring-amber-300 shadow-sm",
  },
  {
    id: "decide",
    label: "Decide",
    countKey: "decide",
    inactive: "bg-red-50 text-red-600 hover:bg-red-100",
    active: "bg-red-100 text-red-800 font-semibold ring-1 ring-red-200 shadow-sm",
  },
  {
    id: "delegate",
    label: "Delegate",
    countKey: "delegate",
    inactive: "bg-sky-50 text-sky-600 hover:bg-sky-100",
    active: "bg-sky-100 text-sky-800 font-semibold ring-1 ring-sky-200 shadow-sm",
  },
  {
    id: "review",
    label: "Review",
    countKey: "review",
    inactive: "bg-emerald-50 text-emerald-600 hover:bg-emerald-100",
    active: "bg-emerald-100 text-emerald-800 font-semibold ring-1 ring-emerald-200 shadow-sm",
  },
  {
    id: "others",
    label: "Others",
    countKey: "others",
    inactive: "bg-slate-100 text-slate-500 hover:bg-slate-200",
    active: "bg-slate-200 text-slate-700 font-semibold ring-1 ring-slate-300 shadow-sm",
  },
];

interface Props {
  morningOf: string;
  generatedAt: string;
  readTimeSeconds: number;
  counts: TabCounts;
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  onReanalyze: () => void;
  processing: boolean;
}

export function Header({
  morningOf,
  generatedAt,
  readTimeSeconds,
  counts,
  activeTab,
  onTabChange,
  onReanalyze,
  processing,
}: Props) {
  return (
    <header>
      {/* title row */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-indigo-600">
            Chief of Staff
          </p>
          <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-slate-900">
            {formatMorning(morningOf)}
          </h1>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-500">
            <Clock size={13} /> Briefing as of {formatTime(generatedAt)} · ~
            {Math.round(readTimeSeconds / 60) || 1} min read
          </p>
        </div>
        <button
          onClick={onReanalyze}
          disabled={processing}
          title="Re-run AI analysis over the current inbox"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw size={13} className={processing ? "animate-spin" : ""} />
          {processing ? "Refreshing…" : "Refresh inbox"}
        </button>
      </div>

      {/* colored tab chips */}
      <nav className="mt-4 flex flex-wrap gap-1.5">
        {TABS.map((tab) => {
          const count = tab.countKey !== null ? counts[tab.countKey] : null;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition ${
                isActive ? tab.active : `font-medium ${tab.inactive}`
              }`}
            >
              {count !== null && (
                <span className="text-base font-bold leading-none tabular-nums">{count}</span>
              )}
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* thin separator below tabs */}
      <div className="mt-3 border-b border-slate-200" />
    </header>
  );
}
