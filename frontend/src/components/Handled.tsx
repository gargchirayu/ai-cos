import { ChevronDown, ChevronRight, Inbox } from "lucide-react";
import { useState } from "react";
import type { MessageTriage } from "../types";
import { channelMeta } from "../lib";

export function Handled({ messages }: { messages: MessageTriage[] }) {
  const [open, setOpen] = useState(false);
  if (messages.length === 0) return null;

  return (
    <section className="mb-6">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition hover:bg-slate-50"
      >
        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        <Inbox size={16} className="text-slate-400" />
        <span className="text-sm font-semibold text-slate-700">
          Filtered out — {messages.length} message{messages.length === 1 ? "" : "s"} that don't need you
        </span>
        <span className="ml-auto text-xs text-slate-400">noise, FYIs, handled &amp; superseded</span>
      </button>

      {open && (
        <ul className="mt-2 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {messages.map((m) => {
            const { Icon, className } = channelMeta[m.channel];
            const dim = m.status !== "active";
            return (
              <li key={m.id} className="flex items-start gap-3 px-4 py-2.5">
                <Icon size={15} className={`mt-0.5 flex-none ${className}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className={`text-[13px] font-medium ${dim ? "text-slate-400 line-through" : "text-slate-700"}`}
                    >
                      {m.from}
                    </span>
                    {m.subject && (
                      <span className="truncate text-[13px] text-slate-500">— {m.subject}</span>
                    )}
                    {m.status === "superseded" && (
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-slate-400">
                        superseded
                      </span>
                    )}
                    {m.status === "resolved" && (
                      <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-emerald-600">
                        resolved
                      </span>
                    )}
                  </div>
                  <p className="text-[12.5px] leading-snug text-slate-400">{m.reasoning}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
