"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowRight, AudioLines, BellRing, CircleDollarSign, Flag, Headphones, MicOff, PhoneForwarded, Repeat2, Sparkles, TriangleAlert } from "lucide-react";
import { useStore } from "@/lib/store";
import { setFocus, type DialFocus } from "@/lib/bus";
import { YESTERDAY, cuesOf, hasMismatch, hasSoftMiss, isCompliance } from "@/lib/mock/conversations";
import { RELEASES } from "@/lib/mock/health";
import { DIAL_MOMENTS, MOMENTS } from "@/lib/photos";
import { hourly, windowShare } from "@/lib/hours";
import { clock, compact, fullDate, money, pct, shortDate } from "@/lib/format";
import type { ChannelStat, Conversation } from "@/lib/mock/types";
import { TrendChart } from "@/components/TrendChart";
import { ChannelIcon, OUTCOME_LABEL, Photo, Tilt, Verdict } from "@/components/ui";
import type { DialTile, HoverInfo, TileCat } from "@/components/three/DayDial";

const DayDial = dynamic(() => import("@/components/three/DayDial"), { ssr: false, loading: () => <div className="hero-still" /> });

type Metric = "conversations" | "contained" | "payments" | "plans" | "transfers" | "silent";
const METRICS: { key: Metric; label: string; icon: React.ReactNode; worse: "up" | "down" | "watch" }[] = [
  { key: "conversations", label: "Conversations", icon: <AudioLines size={16} />, worse: "down" },
  { key: "contained", label: "Handled by the bot", icon: <Sparkles size={16} />, worse: "down" },
  { key: "payments", label: "Payments taken", icon: <CircleDollarSign size={16} />, worse: "down" },
  { key: "plans", label: "Plans set up", icon: <Repeat2 size={16} />, worse: "watch" },
  { key: "transfers", label: "Transfers to an agent", icon: <PhoneForwarded size={16} />, worse: "up" },
  { key: "silent", label: "Silent calls", icon: <MicOff size={16} />, worse: "up" },
];

const catOf = (c: Conversation): TileCat => {
  if (hasSoftMiss(c)) return "soft";
  if (c.vendor.verdict === "fail" || c.review.status === "fail") return "fail";
  if (c.outcome === "payment" || c.outcome === "plan") return "win";
  if (c.outcome === "silent" || c.outcome === "dropped") return "quiet";
  return "other";
};
const groupsOf = (c: Conversation): DialFocus[] => {
  const g: DialFocus[] = [];
  if (hasSoftMiss(c)) g.push("wins-cues");
  if (c.outcome === "silent") g.push("silent");
  if (hasMismatch(c)) g.push("mismatch");
  if (c.flags.length) g.push("flagged");
  if (isCompliance(c)) g.push("compliance");
  return g;
};

const LEGEND: { key: DialFocus; label: string; color: string }[] = [
  { key: "wins-cues", label: "Wins with a cue", color: "#f1a63a" },
  { key: "silent", label: "Silent calls", color: "#7d8f9d" },
  { key: "mismatch", label: "Account mismatch", color: "#e0607a" },
  { key: "compliance", label: "Compliance words", color: "#6d7ee6" },
];

export default function Today() {
  const s = useStore();
  const router = useRouter();
  const [chan, setChan] = useState<"all" | "voice" | "chat">("all");
  const [metric, setMetric] = useState<Metric>("plans");
  const [focus, setF] = useState<DialFocus>("none");
  const [hover, setHover] = useState<HoverInfo | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const yday = useMemo(() => s.convs.filter((c) => c.day === YESTERDAY), [s.convs]);
  // the dial is built once, from the morning's sample
  const [tiles] = useState<DialTile[]>(() => s.convs.filter((c) => c.day === YESTERDAY).map((c) => ({ id: c.id, minute: c.minute, cat: catOf(c), groups: groupsOf(c) })));
  const last = s.health[s.health.length - 1];
  const [vol] = useState(() => hourly(last.voice.conversations, last.chat.conversations));
  const prev7 = s.health.slice(-8, -1);

  const value = (st: ChannelStat, m: Metric) => (m === "contained" ? pct(st.contained, st.conversations) : st[m]);
  const pick = (d: (typeof s.health)[number], m: Metric) => {
    if (chan === "voice") return value(d.voice, m);
    if (chan === "chat") return value(d.chat, m);
    if (m === "contained") return pct(d.voice.contained + d.chat.contained, d.voice.conversations + d.chat.conversations);
    return d.voice[m] + d.chat[m];
  };

  const soft = yday.filter(hasSoftMiss);
  const paidUsd = chan === "voice" ? last.voice.paidUsd : chan === "chat" ? last.chat.paidUsd : last.voice.paidUsd + last.chat.paidUsd;

  const setDial = (f: DialFocus) => {
    const next = focus === f ? "none" : f;
    setF(next);
    setFocus(next);
  };
  const showOnDial = (f: DialFocus) => {
    setF(f);
    setFocus(f);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const act = async (id: string, status: "reported" | "dismissed") => {
    setBusy(id + status);
    await s.setAlert(id, status);
    setBusy(null);
    s.toast(status === "reported" ? "Posted to the QA channel in Teams, with the conversation IDs." : "Alert dismissed for today.", status === "reported" ? "ok" : "info");
  };

  const hovered = hover ? s.convs.find((c) => c.id === hover.id) : undefined;
  const fmt = (n: number) => (metric === "contained" ? `${Math.round(n)}%` : compact(Math.round(n)));

  return (
    <>
      <section className="hero" aria-label="Yesterday on a 24 hour dial">
        <div className="hero-3d">
          <DayDial tiles={tiles} voice={vol.voice} chat={vol.chat} moments={DIAL_MOMENTS} dayLabel={shortDate(YESTERDAY).toUpperCase()} onPick={(id) => router.push(`/queue/${id}`)} onHover={setHover} />
        </div>
        <div className="hero-copy">
          <span className="eyebrow">
            <BellRing size={14} /> Morning check, {fullDate("2026-10-29")}
          </span>
          <h1>
            Yesterday, {(last.voice.conversations + last.chat.conversations).toLocaleString("en-US")} conversations. <em>{soft.length} of the wins</em> need a second listen.
          </h1>
          <p>Every tile on the rim is a conversation from this morning's sample, at the hour it happened. The amber edges are payments and plans where the consumer mentioned a hardship or a dispute, and the vendor scored every one of them as a pass.</p>
          <div className="hero-actions">
            <Link className="btn btn-cue" href="/queue?view=wins-cues">
              Start with the {soft.length} <ArrowRight size={16} />
            </Link>
            <Link className="btn btn-ghost" href="/queue">
              <Headphones size={16} /> Full queue
            </Link>
          </div>
        </div>
        <div className="legend" role="group" aria-label="Lift tiles on the dial">
          {LEGEND.map((l) => (
            <button key={l.key} className={focus === l.key ? "on" : ""} onClick={() => setDial(l.key)} aria-pressed={focus === l.key}>
              <i style={{ background: l.color }} />
              {l.label}
            </button>
          ))}
        </div>
        {hover && hovered && (
          <div className="dial-tip" style={{ left: hover.x, top: hover.y }}>
            <b>
              {hovered.id} · {clock(hovered.minute)}
            </b>
            {OUTCOME_LABEL[hovered.outcome]}
            {cuesOf(hovered)[0] ? `, ${cuesOf(hovered)[0].type} cue` : ""}
          </div>
        )}
      </section>

      <section className="section" aria-label="Bot health">
        <div className="section-title">
          <div>
            <h2>Bot health, {shortDate(YESTERDAY)}</h2>
            <p className="muted small">Compared with the 7 days before. Release 4.2 went out on Oct 27.</p>
          </div>
          <div className="seg" role="group" aria-label="Channel">
            {(["all", "voice", "chat"] as const).map((c) => (
              <button key={c} className={chan === c ? "on" : ""} onClick={() => setChan(c)}>
                {c === "all" ? "All" : c === "voice" ? "Voice" : "Chat"}
              </button>
            ))}
          </div>
        </div>
        <div className="grid kpis">
          {METRICS.map((m, i) => {
            const v = pick(last, m.key);
            const avg = prev7.reduce((a, d) => a + pick(d, m.key), 0) / prev7.length;
            const delta = avg ? Math.round(((v - avg) / avg) * 100) : 0;
            const big = Math.abs(delta) >= 15 || (m.key === "silent" && v - avg >= 4);
            const cls = Math.abs(delta) < 3 ? "flat" : delta > 0 ? (m.worse === "up" ? "up-bad" : m.worse === "watch" ? "up-bad" : "up-good") : m.worse === "down" ? "down-bad" : "down-good";
            return (
              <button key={m.key} className={`card kpi lift ${metric === m.key ? "on" : ""}`} style={{ animationDelay: `${i * 50}ms` }} onClick={() => setMetric(m.key)} aria-pressed={metric === m.key}>
                <span className="k-label">
                  {m.icon}
                  {m.label}
                </span>
                <div className="k-value mono">{m.key === "contained" ? `${v}%` : v.toLocaleString("en-US")}</div>
                <div className={`k-delta ${cls}`}>
                  {delta > 0 ? "+" : ""}
                  {delta}% vs 7-day avg{m.key === "payments" ? `, ${money(paidUsd, false)}` : ""}
                </div>
                {big && (
                  <span className="k-flag" title="Unusual for this day">
                    <Flag size={16} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-head" style={{ marginBottom: 4 }}>
            <h3>{METRICS.find((m) => m.key === metric)?.label}, last 14 days</h3>
          </div>
          <TrendChart
            title={`${METRICS.find((m) => m.key === metric)?.label} per day, voice and chat`}
            days={s.health.map((d) => d.day)}
            series={[
              { key: "voice", label: "Voice", color: "var(--series-voice)", values: s.health.map((d) => value(d.voice, metric)) },
              { key: "chat", label: "Chat", color: "var(--series-chat)", values: s.health.map((d) => value(d.chat, metric)) },
            ].filter((x) => chan === "all" || x.key === chan)}
            markers={RELEASES}
            format={fmt}
          />
        </div>
      </section>

      <section className="section" aria-label="Wins worth a second listen">
          <div className="section-title" style={{ marginBottom: 12 }}>
            <h2>Wins worth a second listen</h2>
            <Link className="small strong" href="/queue?view=wins-cues" style={{ color: "var(--accent)" }}>
              All in the queue
            </Link>
          </div>
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(280px, 100%), 1fr))" }}>
            {soft.map((c) => {
              const cue = cuesOf(c)[0];
              const turn = c.transcript[cue.turn];
              const at = turn.text.indexOf(cue.phrase);
              return (
                <Tilt key={c.id} className="lift" max={5}>
                  <Link href={`/queue/${c.id}`} className="win-card">
                    <div className="win-meta">
                      <ChannelIcon channel={c.channel} size={15} />
                      <span className="strong">{c.id}</span>
                      <span className="muted small">{clock(c.minute)}</span>
                    </div>
                    <p className="quote">
                      &ldquo;{turn.text.slice(0, at)}
                      <mark>{cue.phrase}</mark>
                      {turn.text.slice(at + cue.phrase.length)}&rdquo;
                    </p>
                    <div className="win-meta">
                      <span className="chip chip-accent">
                        {OUTCOME_LABEL[c.outcome]} {c.said ? money(c.said.amount) : ""}
                        {c.said?.count ? "/mo" : ""}
                      </span>
                      <span className="chip chip-cue">{cue.type === "hardship" ? "Hardship" : "Dispute"} cue</span>
                    </div>
                    <div className="win-foot">
                      <span className="small muted">Vendor {c.vendor.verdict === "pass" ? "pass" : "fail"}, {c.vendor.score}</span>
                      <Verdict v={c.review.status} label={c.review.status === "todo" ? undefined : "You:"} />
                    </div>
                  </Link>
                </Tilt>
              );
            })}
          </div>
      </section>

      <section className="section" aria-label="Alerts">
        <div className="card">
          <div className="card-head">
            <h3>Alerts this morning</h3>
            <span className="chip">{s.alerts.filter((a) => a.status === "open").length} open</span>
          </div>
          <div className="alerts" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(380px, 100%), 1fr))", alignItems: "start" }}>
            {s.alerts.map((a, i) => (
              <div key={a.id} className={`alert ${a.level} ${a.status !== "open" ? "done" : ""}`} style={{ animationDelay: `${i * 60}ms` }}>
                <span className="alert-ic">
                  <TriangleAlert size={18} />
                </span>
                <div>
                  <h4>{a.title}</h4>
                  <p>{a.detail}</p>
                  <div className="alert-actions">
                    {a.view && (
                      <Link className="btn btn-ghost btn-sm" href={`/queue?view=${a.view}`}>
                        Open in queue
                      </Link>
                    )}
                    {a.view && a.view !== "todo" && a.view !== "all" && a.view !== "disputes" && (
                      <button className="btn btn-ghost btn-sm" onClick={() => showOnDial(a.view as DialFocus)}>
                        Show on dial
                      </button>
                    )}
                    {a.status === "open" ? (
                      <>
                        <button className="btn btn-primary btn-sm" disabled={!!busy} onClick={() => act(a.id, "reported")}>
                          {busy === a.id + "reported" ? "Posting..." : "Report to QA lead"}
                        </button>
                        <button className="btn btn-ghost btn-sm" disabled={!!busy} onClick={() => act(a.id, "dismissed")}>
                          Dismiss
                        </button>
                      </>
                    ) : (
                      <span className={`chip ${a.status === "reported" ? "chip-ok" : ""}`}>{a.status === "reported" ? "Reported" : "Dismissed"}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" aria-label="When people reach out">
        <div className="section-title">
          <div>
            <h2>When they reach out</h2>
            <p className="muted small">Share of yesterday's conversations in each part of the day, and how much of it came in by chat.</p>
          </div>
        </div>
        <div className="grid hours">
          {MOMENTS.map((m, i) => {
            const w = windowShare(vol.voice, vol.chat, m.from, m.to);
            const cues = soft.filter((c) => c.minute >= m.from * 60 && c.minute < m.to * 60).length;
            return (
              <Tilt key={m.id} className="hour-card" max={5}>
                <div className="ph">
                  <Photo id={m.id} w={480} h={340} alt={m.alt} />
                  <span className="t">{m.label}</span>
                </div>
                <div className="body" style={{ animationDelay: `${i * 60}ms` }}>
                  <strong className="mono">{w.share}%</strong> <span className="muted small">of the day</span>
                  <p className="small" style={{ marginTop: 4 }}>
                    {w.chatShare}% by chat{cues ? `, ${cues} of the wins with a cue` : ""}
                  </p>
                </div>
              </Tilt>
            );
          })}
        </div>
      </section>
    </>
  );
}
