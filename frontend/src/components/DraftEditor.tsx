/**
 * Shared editable draft box used across SituationCards and the Review tab note boxes.
 *
 * For email situations it opens the native mail app via a `mailto:` URI pre-filled
 * with recipient, subject and body. For WhatsApp it opens the universal
 * api.whatsapp.com click-to-chat link with the draft pre-filled — the user picks
 * the contact, which is the best we can do without a stored phone number.
 * Slack has no universal deep-link for composing a DM, so falls back to copy-only.
 *
 * In a production system these would be replaced with OAuth-connected send actions
 * (Gmail API, Slack Web API, WhatsApp Business API), but the URL-scheme approach
 * demonstrates the intent without requiring credentials.
 */

import { Mail, Phone } from "lucide-react";
import { useState } from "react";
import type { Channel } from "../types";
import { CopyButton } from "./CopyButton";

function parseEmail(from: string): string | undefined {
  // "Sarah Chen <sarah@co.com>" → "sarah@co.com"
  // [^@>\s]+ stops before the @ so the pattern can match it literally
  const m = from.match(/<([^@>\s]+@[^>]+)>/);
  if (m) return m[1];
  // bare "user@domain.com"
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(from.trim()) ? from.trim() : undefined;
}

function ReplyAction({
  channel,
  draft,
  recipientEmail,
  subject,
}: {
  channel: Channel | undefined;
  draft: string;
  recipientEmail: string | undefined;
  subject: string | null | undefined;
}) {
  if (!draft.trim() || !channel) return null;

  if (channel === "email" && recipientEmail) {
    const params = new URLSearchParams();
    if (subject) params.set("subject", `Re: ${subject}`);
    params.set("body", draft);
    const href = `mailto:${recipientEmail}?${params.toString()}`;
    return (
      <a
        href={href}
        className="inline-flex items-center gap-1.5 rounded-md border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700 transition hover:bg-sky-100"
        title={`Opens your mail app addressed to ${recipientEmail}`}
      >
        <Mail size={13} />
        Reply via Mail
      </a>
    );
  }

  if (channel === "whatsapp") {
    // api.whatsapp.com/send?text= works on both mobile (app) and desktop (Web)
    // without a phone number — user picks the contact from their list.
    const href = `https://api.whatsapp.com/send?text=${encodeURIComponent(draft)}`;
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100"
        title="Opens WhatsApp Web / app with message pre-filled — pick the contact"
      >
        <Phone size={13} />
        Open in WhatsApp
      </a>
    );
  }

  // Slack: no universal deep-link for DMs without workspace URL + member ID
  return null;
}

export function DraftEditor({
  initialDraft = "",
  label = "Drafted reply — edit before sending",
  channel,
  from,
  subject,
}: {
  initialDraft?: string;
  label?: string;
  channel?: Channel;
  from?: string;
  subject?: string | null;
}) {
  const [draft, setDraft] = useState(initialDraft);
  const rows = Math.max(3, (draft || "").split("\n").length);
  const recipientEmail = from ? parseEmail(from) : undefined;

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
          {label}
        </span>
        <div className="flex items-center gap-1.5">
          <ReplyAction
            channel={channel}
            draft={draft}
            recipientEmail={recipientEmail}
            subject={subject}
          />
          <CopyButton text={draft} />
        </div>
      </div>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={rows}
        placeholder={initialDraft ? undefined : "Type your message here…"}
        className="w-full resize-none rounded border border-slate-200 bg-white px-2.5 py-2 text-[13px] leading-relaxed text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-300"
      />
    </div>
  );
}
