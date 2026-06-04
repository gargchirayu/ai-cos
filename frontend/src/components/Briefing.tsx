import { Check, Sunrise } from "lucide-react";
import { useState } from "react";
import type { Briefing as BriefingType } from "../types";

type TodoSeverity = "critical" | "high" | "medium" | "low";

const severityStyle: Record<TodoSeverity, string> = {
  critical: "bg-red-100 text-red-700",
  high: "bg-orange-100 text-orange-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-slate-100 text-slate-500",
};

function getSeverity(text: string, idx: number): TodoSeverity {
  const t = text.toLowerCase();
  if (t.includes("critical") || t.includes("within the hour") || t.includes("immediately"))
    return "critical";
  if (idx === 0 || t.includes("urgent") || t.includes("right now")) return "high";
  if (idx <= 2) return "high";
  if (idx <= 3) return "medium";
  return "low";
}

export function Briefing({ briefing }: { briefing: BriefingType }) {
  const [checked, setChecked] = useState<boolean[]>(() =>
    briefing.top_priorities.map(() => false)
  );

  const toggle = (i: number) =>
    setChecked((prev) => prev.map((v, j) => (j === i ? !v : v)));

  const allDone = checked.every(Boolean);

  return (
    <div className="space-y-5">
      {/* Summary card */}
      <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 p-6 text-white shadow-lg shadow-indigo-200">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-indigo-200">
          <Sunrise size={16} /> Morning briefing
        </div>
        <p className="text-lg font-semibold">{briefing.greeting}</p>
        <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-indigo-50">
          {briefing.summary}
        </p>
      </section>

      {/* Action list */}
      <section>
        <h2 className="mb-2.5 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-500">
          <span className="h-3.5 w-1 rounded-full bg-indigo-500" />
          Today's priorities
        </h2>
        <ul className="space-y-2">
          {briefing.top_priorities.map((priority, i) => {
            const sev = getSeverity(priority, i);
            const done = checked[i];
            return (
              <li
                key={i}
                className={`flex items-start gap-3 rounded-xl border bg-white p-3.5 shadow-sm transition-opacity ${
                  done ? "opacity-50" : ""
                }`}
              >
                <button
                  onClick={() => toggle(i)}
                  aria-label={done ? "Mark incomplete" : "Mark complete"}
                  className={`mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full border-2 transition ${
                    done
                      ? "border-emerald-500 bg-emerald-500"
                      : "border-slate-300 hover:border-indigo-400"
                  }`}
                >
                  {done && <Check size={11} strokeWidth={3} className="text-white" />}
                </button>
                <p
                  className={`flex-1 text-[13.5px] leading-relaxed ${
                    done ? "text-slate-400 line-through" : "text-slate-800"
                  }`}
                >
                  {priority}
                </p>
                <span
                  className={`mt-0.5 flex-none rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${severityStyle[sev]}`}
                >
                  {sev}
                </span>
              </li>
            );
          })}
        </ul>
        {allDone && (
          <p className="mt-3 text-center text-sm font-medium text-emerald-600">
            All done for today ✓
          </p>
        )}
      </section>
    </div>
  );
}
