import {
  AlertTriangle,
  CalendarClock,
  ChevronDown,
  ChevronRight,
  GitCompareArrows,
  ShieldAlert,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";
import type { Flag, FlagType, MessageTriage } from "../types";
import { channelMeta, formatTime, severityChip } from "../lib";

const flagIcon: Record<FlagType, typeof ShieldAlert> = {
  security: ShieldAlert,
  contradiction: GitCompareArrows,
  deadline: CalendarClock,
  conflict: AlertTriangle,
  escalation: TrendingUp,
};

function senderShort(from: string) {
  return from.replace(/<[^>]+>/, "").trim();
}

/** Split detail text into bullet points when it contains multiple sentences. */
function FlagDetail({ text }: { text: string }) {
  const sentences = text.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 0);
  if (sentences.length <= 1) {
    return <p className="mt-1.5 text-[13px] leading-relaxed text-slate-600">{text}</p>;
  }
  return (
    <ul className="mt-1.5 space-y-1.5">
      {sentences.map((s, i) => (
        <li key={i} className="flex gap-2 text-[13px] leading-relaxed text-slate-600">
          <span className="mt-[7px] h-1 w-1 flex-none rounded-full bg-slate-400" />
          <span>{s}</span>
        </li>
      ))}
    </ul>
  );
}

function FlagCard({ flag, messages }: { flag: Flag; messages: MessageTriage[] }) {
  const [msgsOpen, setMsgsOpen] = useState(false);

  const Icon = flagIcon[flag.type];
  const sources = flag.message_ids
    .map((id) => messages.find((m) => m.id === id))
    .filter((m): m is MessageTriage => Boolean(m));

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="p-3.5">
        <div className="flex items-start gap-2.5">
          {/* icon */}
          <div
            className={`mt-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-lg ${severityChip[flag.severity]}`}
          >
            <Icon size={15} />
          </div>

          <div className="min-w-0 flex-1">
            {/* title + badge */}
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-900">{flag.title}</h3>
              <span
                className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${severityChip[flag.severity]}`}
              >
                {flag.type}
              </span>
            </div>

            {/* detail — always visible, formatted as bullets if multi-sentence */}
            <FlagDetail text={flag.detail} />

            {/* recommendation — indigo box, same pattern as SituationCard */}
            <div className="mt-2.5 rounded-lg bg-indigo-50/70 px-3 py-2">
              <p className="text-[13px] leading-relaxed text-indigo-900">
                <span className="font-semibold">Action: </span>
                {flag.recommendation}
              </p>
            </div>

            {/* read source messages */}
            {sources.length > 0 && (
              <button
                onClick={() => setMsgsOpen((o) => !o)}
                className="mt-2.5 flex items-center gap-1 text-[12px] font-medium text-slate-500 hover:text-slate-800"
              >
                {msgsOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                Read source message{sources.length === 1 ? "" : "s"} ({sources.length})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* source messages panel */}
      {msgsOpen && sources.length > 0 && (
        <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-3">
          <ol className="space-y-3">
            {sources.map((m) => {
              const { Icon: CIcon, className: chClass } = channelMeta[m.channel];
              return (
                <li key={m.id} className="rounded-lg border bg-white p-3">
                  <div className="mb-1.5 flex flex-wrap items-center gap-2 text-[12px]">
                    <CIcon size={13} className={`flex-none ${chClass}`} />
                    <span className="font-semibold text-slate-800">{senderShort(m.from)}</span>
                    {m.subject && <span className="text-slate-400">· {m.subject}</span>}
                    <span className="ml-auto text-slate-400">{formatTime(m.timestamp)}</span>
                  </div>
                  {m.body ? (
                    <p className="whitespace-pre-line text-[12.5px] leading-relaxed text-slate-700">
                      {m.body}
                    </p>
                  ) : (
                    <p className="text-[12px] italic text-slate-400">no message body</p>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}

export function Flags({ flags, messages }: { flags: Flag[]; messages: MessageTriage[] }) {
  if (flags.length === 0)
    return <p className="py-8 text-center text-sm text-slate-400">No flags today.</p>;
  return (
    <section>
      <div className="grid gap-2.5 sm:grid-cols-2">
        {flags.map((f) => (
          <FlagCard key={f.id} flag={f} messages={messages} />
        ))}
      </div>
    </section>
  );
}
