// Mirrors backend/schema.py (the data contract). Keep in sync.

export type Channel = "email" | "slack" | "whatsapp";
export type Category = "ignore" | "delegate" | "decide";
export type Status = "active" | "superseded" | "resolved";
export type Urgency = "critical" | "high" | "medium" | "low";
export type FlagType =
  | "security"
  | "contradiction"
  | "deadline"
  | "conflict"
  | "escalation";
export type Severity = "high" | "medium" | "low";

export interface Briefing {
  greeting: string;
  summary: string;
  top_priorities: string[];
  read_time_seconds: number;
}

export interface Situation {
  id: string;
  title: string;
  status: Status;
  category: Category;
  urgency: Urgency;
  deadline: string | null;
  summary: string;
  what_changed: string | null;
  recommendation: string;
  drafted_response: string | null;
  delegate_to: string | null;
  message_ids: number[];
}

export interface MessageTriage {
  id: number;
  channel: Channel;
  from: string;
  subject: string | null;
  timestamp: string;
  category: Category;
  reasoning: string;
  drafted_response: string | null;
  delegate_to: string | null;
  situation_id: string | null;
  status: Status;
  superseded_by: number | null;
}

export interface Flag {
  id: string;
  type: FlagType;
  severity: Severity;
  title: string;
  detail: string;
  message_ids: number[];
  recommendation: string;
}

export interface Stats {
  total: number;
  decide: number;
  delegate: number;
  ignore: number;
  flags: number;
}

export interface Analysis {
  morning_of: string;
  ceo: string;
  generated_at: string;
  stats: Stats;
  briefing: Briefing;
  situations: Situation[];
  messages: MessageTriage[];
  flags: Flag[];
}
