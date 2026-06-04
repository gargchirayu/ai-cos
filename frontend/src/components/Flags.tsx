import {
  AlertTriangle,
  CalendarClock,
  GitCompareArrows,
  ShieldAlert,
  TrendingUp,
} from "lucide-react";
import type { Flag, FlagType } from "../types";
import { severityChip } from "../lib";

const flagIcon: Record<FlagType, typeof ShieldAlert> = {
  security: ShieldAlert,
  contradiction: GitCompareArrows,
  deadline: CalendarClock,
  conflict: AlertTriangle,
  escalation: TrendingUp,
};

export function Flags({ flags }: { flags: Flag[] }) {
  if (flags.length === 0) return null;
  return (
    <section className="mb-6">
      <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">
        Flags — worth knowing
      </h2>
      <div className="grid gap-2.5 sm:grid-cols-2">
        {flags.map((f) => {
          const Icon = flagIcon[f.type];
          return (
            <div
              key={f.id}
              className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm"
            >
              <div className="flex items-start gap-2.5">
                <div
                  className={`mt-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-lg ${severityChip[f.severity]}`}
                >
                  <Icon size={15} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-900">{f.title}</h3>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${severityChip[f.severity]}`}
                    >
                      {f.type}
                    </span>
                  </div>
                  <p className="mt-1 text-[13px] leading-relaxed text-slate-600">{f.detail}</p>
                  <p className="mt-1.5 text-[13px] font-medium text-slate-800">
                    → {f.recommendation}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
