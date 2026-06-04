import { Sunrise } from "lucide-react";
import type { Briefing as BriefingType } from "../types";

export function Briefing({ briefing }: { briefing: BriefingType }) {
  return (
    <section className="mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 p-6 text-white shadow-lg shadow-indigo-200">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-indigo-200">
        <Sunrise size={16} /> Daily Briefing
      </div>
      <p className="text-lg font-semibold">{briefing.greeting}</p>
      <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-indigo-50">
        {briefing.summary}
      </p>
      <ol className="mt-5 space-y-2">
        {briefing.top_priorities.map((p, i) => (
          <li key={i} className="flex gap-3">
            <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-white/20 text-xs font-bold">
              {i + 1}
            </span>
            <span className="text-sm leading-relaxed text-white">{p}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
