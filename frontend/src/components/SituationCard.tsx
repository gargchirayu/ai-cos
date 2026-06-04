import { ChevronDown, ChevronRight, History, CornerDownRight, UserRound } from "lucide-react";
import { useState } from "react";

import type { MessageTriage, Situation } from "../types";
import { channelMeta, deadlineLabel, formatTime, urgencyMeta } from "../lib";
import { DraftEditor } from "./DraftEditor";

function StatusBadge({ status }: { status: MessageTriage["status"] }) {
  if (status === "active") return null;
  const map = {
    superseded: "bg-slate-200 text-slate-500",
    resolved: "bg-emerald-100 text-emerald-700",
  } as const;
  return (
    <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${map[status]}`}>
      {status}
    </span>
  );
}


function senderShortName(from: string): string {
  // "Sarah Chen <sarah@meridianventures.com>" → "Sarah Chen"
  return from.replace(/<[^>]+>/, "").trim();
}

export function SituationCard({
  situation,
  messages,
  now,
  noteBox = false,
}: {
  situation: Situation;
  messages: MessageTriage[];
  now: string;
  noteBox?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const u = urgencyMeta[situation.urgency];

  const thread = situation.message_ids
    .map((id) => messages.find((m) => m.id === id))
    .filter((m): m is MessageTriage => Boolean(m))
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  // Build a lookup so supersede links show a name, not a number
  const senderById = Object.fromEntries(
    messages.map((m) => [m.id, senderShortName(m.from)])
  );

  // Primary reply target: prefer most recent email (has a mailto: link), then WhatsApp.
  // This is what the "Reply" action in the draft box will address.
  const replyMsg =
    [...thread].reverse().find((m) => m.channel === "email") ??
    [...thread].reverse().find((m) => m.channel === "whatsapp") ??
    thread[thread.length - 1];

  return (
    <div className={`rounded-xl border bg-white shadow-sm ${u.ring}`}>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start gap-2.5">
          <span className={`mt-1.5 h-2.5 w-2.5 flex-none rounded-full ${u.dot}`} />
          <div>
            <h3 className="font-semibold leading-snug text-slate-900">{situation.title}</h3>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${u.chip}`}>
                {u.label}
              </span>
              {situation.deadline && (
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">
                  due {deadlineLabel(situation.deadline, now)}
                </span>
              )}
              {situation.status === "resolved" && (
                <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-emerald-700">
                  resolved
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Summary + recommendation */}
        <p className="mt-2.5 text-[13.5px] leading-relaxed text-slate-600">{situation.summary}</p>

        <div className="mt-2.5 rounded-lg bg-indigo-50/70 px-3 py-2">
          <p className="text-[13.5px] leading-relaxed text-indigo-900">
            <span className="font-semibold">Recommendation: </span>
            {situation.recommendation}
          </p>
        </div>

        {situation.delegate_to && (
          <p className="mt-2 flex items-center gap-1.5 text-[13px] font-medium text-sky-700">
            <UserRound size={14} /> Hand off to {situation.delegate_to}
          </p>
        )}

        {situation.drafted_response && (
          <div className="mt-2.5">
            <DraftEditor
              initialDraft={situation.drafted_response}
              channel={replyMsg?.channel}
              from={replyMsg?.from}
              subject={replyMsg?.subject}
            />
          </div>
        )}

        {/* Empty draft box for review tab — inside the card to match the delegate layout */}
        {noteBox && !situation.drafted_response && (
          <div className="mt-2.5">
            <DraftEditor
              label="Draft a reply, if needed"
              channel={replyMsg?.channel}
              from={replyMsg?.from}
              subject={replyMsg?.subject}
            />
          </div>
        )}

        {/* Thread toggle */}
        {thread.length > 0 && (
          <button
            onClick={() => setOpen((o) => !o)}
            className="mt-3 flex items-center gap-1 text-[12px] font-medium text-slate-500 hover:text-slate-800"
          >
            {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            {open ? "Hide" : "Read"} original message{thread.length === 1 ? "" : "s"} ({thread.length})
          </button>
        )}
      </div>

      {/* Thread — the actual messages, not summaries */}
      {open && (
        <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-3">
          {situation.what_changed && (
            <p className="mb-3 flex gap-2 text-[12.5px] leading-relaxed text-slate-500">
              <History size={14} className="mt-0.5 flex-none" />
              <span>
                <span className="font-semibold text-slate-600">How it evolved: </span>
                {situation.what_changed}
              </span>
            </p>
          )}
          <ol className="space-y-3">
            {thread.map((m) => {
              const { Icon, className: chClass } = channelMeta[m.channel];
              const supersededSender = m.superseded_by
                ? senderById[m.superseded_by]
                : null;
              return (
                <li
                  key={m.id}
                  className={`rounded-lg border bg-white p-3 ${
                    m.status === "superseded" ? "opacity-60" : ""
                  }`}
                >
                  {/* Message meta row */}
                  <div className="mb-1.5 flex flex-wrap items-center gap-2 text-[12px]">
                    <Icon size={13} className={`flex-none ${chClass}`} />
                    <span className="font-semibold text-slate-800">
                      {senderShortName(m.from)}
                    </span>
                    {m.subject && (
                      <span className="text-slate-400">· {m.subject}</span>
                    )}
                    <span className="ml-auto text-slate-400">{formatTime(m.timestamp)}</span>
                    <StatusBadge status={m.status} />
                    {supersededSender && (
                      <span className="flex items-center gap-0.5 text-[11px] text-slate-400">
                        <CornerDownRight size={11} />
                        overridden by {supersededSender}
                      </span>
                    )}
                  </div>

                  {/* Original message body */}
                  {m.body ? (
                    <p className="whitespace-pre-line text-[12.5px] leading-relaxed text-slate-700">
                      {m.body}
                    </p>
                  ) : (
                    <p className="text-[12px] italic text-slate-400">no message body</p>
                  )}

                  {/* Triage reasoning as a small footnote */}
                  <p className="mt-1.5 text-[11.5px] text-slate-400">
                    <span className="font-medium">Triage: </span>{m.reasoning}
                  </p>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}
