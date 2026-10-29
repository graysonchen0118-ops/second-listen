export type Channel = "voice" | "chat";
export type Outcome = "payment" | "plan" | "promise" | "info" | "transfer" | "dropped" | "silent";
export type CueType = "hardship" | "dispute" | "cease" | "attorney" | "bankruptcy" | "military";
export type CheckId = "recording" | "identity" | "disclosure" | "cues" | "readback" | "account" | "tone";
export type Mark = "ok" | "miss" | "na";
export type MyStatus = "todo" | "pass" | "fail";
export type Stance = "confirm" | "dispute";
export type DisputeState = "open" | "vendor-accepted" | "vendor-upheld";

export interface Turn {
  who: "bot" | "consumer" | "system";
  /** seconds from the start of the conversation */
  t: number;
  text: string;
  /** the part of `text` that carries the cue, highlighted in review */
  cue?: { type: CueType; phrase: string; handled: boolean };
}

export interface PayTerms {
  amount: number;
  /** YYYY-MM-DD */
  date: string;
  card: string;
  count?: number;
  freq?: "monthly" | "biweekly";
}

export interface VendorScore {
  verdict: "pass" | "fail";
  score: number;
  by: string;
  note: string;
  criteria: Record<CheckId, Mark>;
}

export interface MyReview {
  status: MyStatus;
  stance?: Stance;
  reason?: string;
  checks: Record<CheckId, Mark>;
  note: string;
  reviewedAt?: string;
  dispute?: DisputeState;
}

export interface Conversation {
  id: string;
  channel: Channel;
  /** YYYY-MM-DD, Eastern */
  day: string;
  /** minutes after midnight, Eastern */
  minute: number;
  durationSec: number;
  consumer: { name: string; state: string };
  account: { id: string; creditor: string; kind: string; balance: number };
  outcome: Outcome;
  /** what the consumer agreed to, in their own words, during the conversation */
  said?: PayTerms;
  /** what the bot wrote in its summary */
  summary?: PayTerms;
  /** what the account system holds */
  record?: PayTerms;
  summaryText: string;
  transcript: Turn[];
  flags: string[];
  vendor: VendorScore;
  review: MyReview;
  /** what the facts in the transcript point to, used to prefill the checklist */
  suggested: Record<CheckId, Mark>;
  silenceSec?: number;
  release: string;
}

export interface ChannelStat {
  conversations: number;
  contained: number;
  payments: number;
  paidUsd: number;
  plans: number;
  transfers: number;
  silent: number;
  alerts: number;
}

export interface DayStat {
  day: string;
  voice: ChannelStat;
  chat: ChannelStat;
}

export type SavedView = "all" | "todo" | "wins-cues" | "flagged" | "silent" | "mismatch" | "compliance" | "disputes";

export interface Alert {
  id: string;
  level: "high" | "medium" | "low";
  channel: Channel | "both";
  title: string;
  detail: string;
  view?: SavedView;
  status: "open" | "reported" | "dismissed";
  metric?: keyof ChannelStat;
}

export type Topic = "hardship" | "dispute" | "cease" | "attorney" | "bankruptcy" | "military" | "identity" | "payments" | "disclosure" | "silence";
export type Decision = "manual" | "calibration" | "ticket";

export interface CalItem {
  id: string;
  convId: string;
  topic: Topic;
  question: string;
  raisedBy: string;
  proposal: Decision;
  status: "open" | "ruled";
  added: string;
}

export interface Ruling {
  id: string;
  date: string;
  convId: string;
  topic: Topic;
  ruling: string;
  reason: string;
  decidedBy: string;
  outcome: Decision;
}

export type RunResult = "pending" | "pass" | "fail";

export interface Run {
  n: number;
  line: string;
  result: RunResult;
}

export interface TestCase {
  id: string;
  ticket: string;
  title: string;
  channel: Channel;
  topic: Topic;
  scenario: string;
  expected: string;
  runs: Run[];
  status: "draft" | "running" | "passed" | "failed";
  owner: string;
  created: string;
  convId?: string;
}

export interface Person {
  id: string;
  name: string;
  role: string;
  team: "qa" | "vendor" | "dev" | "compliance" | "product";
  photo: string;
}
