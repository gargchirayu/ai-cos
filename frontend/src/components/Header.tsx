import { Clock } from "lucide-react";
import type { Analysis } from "../types";
import { formatMorning, formatTime } from "../lib";

function Chip({ value, label, className }: { value: number; label: string; className: string }) {
  return (
    <div className={`flex items-baseline gap-1.5 rounded-lg px-3 py-1.5 ${className}`}>
      <span className="text-lg font-bold leading-none">{value}</span>
      <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
    </div>
  );
}

export function Header({ analysis }: { analysis: Analysis }) {
  const { stats, morning_of, generated_at, briefing } = analysis;
  return (
    <header className="mb-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-indigo-600">
            Chief of Staff
          </div>
          <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-slate-900">
            {formatMorning(morning_of)}
          </h1>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-500">
            <Clock size={13} /> Briefing as of {formatTime(generated_at)} · ~
            {Math.round(briefing.read_time_seconds / 60) || 1} min read
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Chip value={stats.decide} label="Decide" className="bg-red-100 text-red-700" />
          <Chip value={stats.delegate} label="Delegate" className="bg-sky-100 text-sky-700" />
          <Chip value={stats.ignore} label="Ignore" className="bg-slate-200 text-slate-600" />
          <Chip value={stats.flags} label="Flags" className="bg-amber-100 text-amber-700" />
        </div>
      </div>
    </header>
  );
}
