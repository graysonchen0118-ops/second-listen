import type { Alert, ChannelStat, DayStat } from "./types";
import { addDays } from "../format";

const START = "2026-10-15";
const RELEASE_41 = "2026-10-20";
export const RELEASE_42 = "2026-10-27";
export const RELEASES = [
  { day: RELEASE_41, label: "Release 4.1" },
  { day: RELEASE_42, label: "Release 4.2" },
];

function stat(base: number, k: number, after42: boolean, voice: boolean, weekend: boolean): ChannelStat {
  const n = Math.round(base * (weekend ? 0.55 : 1) * (1 + 0.06 * Math.sin(k * 1.7)));
  const contained = Math.round(n * (voice ? 0.71 : 0.78) + Math.cos(k) * 6);
  const plans = Math.round(n * (voice ? 0.16 : 0.19) * (after42 ? 1.17 : 1));
  const payments = Math.round(n * (voice ? 0.21 : 0.17) + Math.sin(k * 2.3) * 4);
  const transfers = Math.round(n * (voice ? 0.12 : 0.09) * (!voice && after42 ? 1.31 : 1));
  const silent = voice ? (after42 ? (k === 13 ? 11 : 9) : 2 + (k % 3)) : 0;
  return {
    conversations: n,
    contained,
    payments,
    paidUsd: Math.round(payments * (voice ? 412 : 365) + Math.cos(k * 1.3) * 900),
    plans,
    transfers,
    silent,
    alerts: (voice ? 2 : 1) + (after42 ? 3 : k % 2),
  };
}

export function seedHealth(): DayStat[] {
  const out: DayStat[] = [];
  for (let k = 0; k < 14; k++) {
    const day = addDays(START, k);
    const dow = new Date(Date.UTC(2026, 9, 15 + k)).getUTCDay();
    const weekend = dow === 0 || dow === 6;
    const after42 = day >= RELEASE_42;
    out.push({ day, voice: stat(620, k, after42, true, weekend), chat: stat(390, k, after42, false, weekend) });
  }
  return out;
}

export function seedAlerts(): Alert[] {
  return [
    {
      id: "AL-1",
      level: "high",
      channel: "both",
      title: "Six wins carry a hardship or dispute cue the bot stepped over",
      detail: "The vendor scored all six as pass. Plans set up jumped the day release 4.2 went out, so it is worth knowing how many of them should have gone to the hardship path instead.",
      view: "wins-cues",
      status: "open",
      metric: "plans",
    },
    {
      id: "AL-2",
      level: "high",
      channel: "voice",
      title: "Silent calls on voice reached 11 yesterday",
      detail: "The 7-day average before release 4.2 was 3. Two of them are in this morning's sample, and both waited a long time before the first prompt.",
      view: "silent",
      status: "open",
      metric: "silent",
    },
    {
      id: "AL-3",
      level: "medium",
      channel: "both",
      title: "Two account records don't match what the consumer agreed to",
      detail: "VC-58262 agreed to the 15th and the account holds November 5. CH-30501 agreed to a monthly amount the account stores differently.",
      view: "mismatch",
      status: "open",
    },
    {
      id: "AL-4",
      level: "medium",
      channel: "chat",
      title: "Chat transfers up 31% on the evening shift",
      detail: "Mostly after 9 PM, and mostly right after the plan offer. Could be the new plan wording, could be the hour.",
      view: "flagged",
      status: "open",
      metric: "transfers",
    },
    {
      id: "AL-5",
      level: "low",
      channel: "voice",
      title: "Debt collector disclosure skipped on one call",
      detail: "VC-58371 went from verification straight to the balance. The vendor caught this one.",
      view: "compliance",
      status: "open",
    },
  ];
}
