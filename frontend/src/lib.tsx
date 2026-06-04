import { Mail, MessageSquare, Phone } from "lucide-react";
import type { Channel, Severity, Urgency } from "./types";

export const channelMeta: Record<
  Channel,
  { label: string; Icon: typeof Mail; className: string }
> = {
  email: { label: "Email", Icon: Mail, className: "text-sky-600" },
  slack: { label: "Slack", Icon: MessageSquare, className: "text-violet-600" },
  whatsapp: { label: "WhatsApp", Icon: Phone, className: "text-emerald-600" },
};

export const urgencyMeta: Record<
  Urgency,
  { label: string; dot: string; ring: string; chip: string }
> = {
  critical: {
    label: "Critical",
    dot: "bg-red-500",
    ring: "border-red-300",
    chip: "bg-red-100 text-red-700",
  },
  high: {
    label: "High",
    dot: "bg-orange-500",
    ring: "border-orange-200",
    chip: "bg-orange-100 text-orange-700",
  },
  medium: {
    label: "Medium",
    dot: "bg-amber-400",
    ring: "border-amber-200",
    chip: "bg-amber-100 text-amber-700",
  },
  low: {
    label: "Low",
    dot: "bg-slate-300",
    ring: "border-slate-200",
    chip: "bg-slate-100 text-slate-600",
  },
};

export const severityChip: Record<Severity, string> = {
  high: "bg-red-100 text-red-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-slate-100 text-slate-600",
};

export function formatMorning(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Human deadline relative to "now" (the moment the briefing was generated). */
export function deadlineLabel(deadline: string, now: string): string {
  const diffMs = new Date(deadline).getTime() - new Date(now).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins <= -30) return "overdue";
  if (mins <= 5) return "now";
  if (mins < 90) return `in ~${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `in ~${hours}h`;
  const days = Math.round(hours / 24);
  return `in ~${days}d`;
}

const urgencyRank: Record<Urgency, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export function byUrgency<T extends { urgency: Urgency }>(a: T, b: T): number {
  return urgencyRank[a.urgency] - urgencyRank[b.urgency];
}
