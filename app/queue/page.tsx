"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { ChevronRight, Inbox, RotateCcw } from "lucide-react";
import { useLatency, useStore } from "@/lib/store";
import { pulse } from "@/lib/bus";
import { CUE_LABEL, cuesOf, hasMismatch, hasSoftMiss, isCompliance } from "@/lib/mock/conversations";
import { clock, dur, money, shortDate } from "@/lib/format";
import type { Conversation, SavedView } from "@/lib/mock/types";
import { ChannelIcon, Empty, OutcomeChip, Pager, Skel, Verdict } from "@/components/ui";

const VIEWS: { key: SavedView; label: string; test: (c: Conversation) => boolean; cue?: boolean }[] = [
  { key: "all", label: "All sampled", test: () => true },
  { key: "todo", label: "To review", test: (c) => c.review.status === "todo" },
  { key: "wins-cues", label: "Wins with a cue", test: hasSoftMiss, cue: true },
  { key: "flagged", label: "Flagged", test: (c) => c.flags.length > 0 },
  { key: "silent", label: "Silent calls", test: (c) => c.outcome === "silent" },
  { key: "mismatch", label: "Account mismatch", test: hasMismatch },
  { key: "compliance", label: "Compliance words", test: isCompliance },
  { key: "disputes", label: "My disputes", test: (c) => c.review.stance === "dispute" },
];

const PER = 12;

function Queue() {
  const s = useStore();
  const params = useSearchParams();
  const router = useRouter();
  const [view, setView] = useState<SavedView>((params.get("view") as SavedView) || "all");
  const [q, setQ] = useState(params.get("q") ?? "");
  const [channel, setChannel] = useState("any");
  const [outcome, setOutcome] = useState("any");
  const [vendor, setVendor] = useState("any");
  const [mine, setMine] = useState("any");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);

  // follow links from elsewhere (search box, alerts) while already on this page
  useEffect(() => {
    setView((params.get("view") as SavedView) || "all");
    setQ(params.get("q") ?? "");
    setPage(1);
  }, [params]);

  const key = [view, q, channel, outcome, vendor, mine, sort].join("|");
  const ready = useLatency(key, 420);
  useEffect(() => setPage(1), [key]);

  const list = useMemo(() => {
    const v = VIEWS.find((x) => x.key === view) ?? VIEWS[0];
    const needle = q.trim().toLowerCase();
    const out = s.convs.filter((c) => {
      if (!v.test(c)) return false;
      if (channel !== "any" && c.channel !== channel) return false;
      if (outcome !== "any" && c.outcome !== outcome) return false;
      if (vendor !== "any" && c.vendor.verdict !== vendor) return false;
      if (mine !== "any" && c.review.status !== mine) return false;
      if (needle) {
        const hay = [c.id, c.consumer.name, c.consumer.state, c.account.creditor, c.account.id, ...c.transcript.map((t) => t.text)].join(" ").toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
    const at = (c: Conversation) => (c.day === "2026-10-28" ? 1440 : 0) + c.minute;
    out.sort((a, b) => (sort === "newest" ? at(b) - at(a) : sort === "oldest" ? at(a) - at(b) : sort === "longest" ? b.durationSec - a.durationSec : (b.said?.amount ?? 0) - (a.said?.amount ?? 0)));
    return out;
  }, [s.convs, view, q, channel, outcome, vendor, mine, sort]);

  const pages = Math.max(1, Math.ceil(list.length / PER));
  const shown = list.slice((page - 1) * PER, page * PER);
  const counts = useMemo(() => Object.fromEntries(VIEWS.map((v) => [v.key, s.convs.filter(v.test).length])), [s.convs]);

  const choose = (v: SavedView, query = q) => {
    setView(v);
    pulse({ kind: "filter", tone: v === "wins-cues" ? "warn" : "info" });
    const p = new URLSearchParams();
    if (v !== "all") p.set("view", v);
    if (query.trim()) p.set("q", query.trim());
    router.replace(p.toString() ? `/queue?${p}` : "/queue", { scroll: false });
  };
  const clear = () => {
    setQ("");
    setChannel("any");
    setOutcome("any");
    setVendor("any");
    setMine("any");
    setSort("newest");
    choose("all", "");
  };
  const todo = s.convs.filter((c) => c.review.status === "todo").length;

  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">Review queue</span>
          <h1>{todo} conversations waiting</h1>
          <p>The morning sample from Oct 27 and Oct 28: everything the vendor flagged, plus the searches and the wins that nobody flagged.</p>
        </div>
      </div>

      <div className="card">
        <div className="tabs" role="tablist" aria-label="Saved views">
          {VIEWS.map((v) => (
            <button key={v.key} role="tab" aria-selected={view === v.key} className={`tab ${view === v.key ? "on" : ""} ${v.cue ? "cue" : ""}`} onClick={() => choose(v.key)}>
              {v.label}
              <span className="tab-n">{counts[v.key]}</span>
            </button>
          ))}
        </div>
        <div className="filters">
          <div className="field">
            <label htmlFor="f-q">Search</label>
            <input id="f-q" className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ID, name, creditor, a phrase" />
          </div>
          <div className="field">
            <label htmlFor="f-ch">Channel</label>
            <select id="f-ch" className="select" value={channel} onChange={(e) => setChannel(e.target.value)}>
              <option value="any">Voice and chat</option>
              <option value="voice">Voice</option>
              <option value="chat">Chat</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="f-out">Outcome</label>
            <select id="f-out" className="select" value={outcome} onChange={(e) => setOutcome(e.target.value)}>
              <option value="any">Any outcome</option>
              <option value="payment">Paid in full</option>
              <option value="plan">Plan set up</option>
              <option value="promise">Promise to pay</option>
              <option value="info">Information</option>
              <option value="transfer">Transferred</option>
              <option value="dropped">Dropped</option>
              <option value="silent">Silent call</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="f-v">Vendor score</label>
            <select id="f-v" className="select" value={vendor} onChange={(e) => setVendor(e.target.value)}>
              <option value="any">Pass or fail</option>
              <option value="pass">Vendor pass</option>
              <option value="fail">Vendor fail</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="f-m">My review</label>
            <select id="f-m" className="select" value={mine} onChange={(e) => setMine(e.target.value)}>
              <option value="any">Any</option>
              <option value="todo">To review</option>
              <option value="pass">Passed</option>
              <option value="fail">Failed</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="f-s">Sort</label>
            <select id="f-s" className="select" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="longest">Longest first</option>
              <option value="amount">Largest amount</option>
            </select>
          </div>
        </div>
      </div>

      <div className="section">
        {!ready ? (
          <div className="rows" aria-busy="true">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="row" style={{ animationDelay: `${i * 40}ms` }}>
                <Skel h={34} w={140} r={10} />
                <Skel h={14} />
                <Skel h={14} />
                <Skel h={22} w={90} r={99} />
                <Skel h={22} w={80} r={99} />
              </div>
            ))}
          </div>
        ) : shown.length === 0 ? (
          <div className="card">
            <Empty
              icon={<Inbox size={24} />}
              title="Nothing matches"
              text="No conversation in the sample fits these filters. Loosen one, or clear them all."
              action={
                <button className="btn btn-ghost btn-sm" onClick={clear}>
                  <RotateCcw size={15} /> Clear filters
                </button>
              }
            />
          </div>
        ) : (
          <div className="rows">
            {shown.map((c, i) => {
              const cues = cuesOf(c);
              return (
                <Link key={c.id} href={`/queue/${c.id}`} className={`row ${hasSoftMiss(c) ? "soft" : ""}`} style={{ animationDelay: `${i * 35}ms` }}>
                  <div className="id">
                    <ChannelIcon channel={c.channel} />
                    <div className="cell-stack">
                      <span>{c.id}</span>
                      <span className="muted small">
                        {shortDate(c.day)}, {clock(c.minute)} · {dur(c.durationSec)}
                      </span>
                    </div>
                  </div>
                  <div className="cell-stack">
                    <span className="strong">{c.outcome === "silent" ? "Unknown caller" : c.consumer.name}</span>
                    <span className="muted small">
                      {c.outcome === "silent" ? "No audio" : `${c.account.creditor}, ${c.consumer.state}`}
                    </span>
                  </div>
                  <div className="chips">
                    <OutcomeChip outcome={c.outcome} />
                    {c.said && (
                      <span className="chip">
                        {money(c.said.amount)}
                        {c.said.count ? " a month" : ""}
                      </span>
                    )}
                    {cues.map((q) => (
                      <span key={q.turn} className={`chip ${q.handled ? "chip-ok" : "chip-cue"}`}>
                        {CUE_LABEL[q.type]}
                      </span>
                    ))}
                    {hasMismatch(c) && <span className="chip chip-err">Account mismatch</span>}
                  </div>
                  <div className="cell-stack">
                    <span className="small muted">Vendor</span>
                    <span>
                      <Verdict v={c.vendor.verdict} /> <span className="small muted mono">{c.vendor.score}</span>
                    </span>
                  </div>
                  <div className="end">
                    <Verdict v={c.review.status} label={c.review.status === "todo" ? undefined : "You:"} />
                    <span className="small" style={{ color: "var(--accent)", display: "inline-flex", alignItems: "center", gap: 2 }}>
                      Open <ChevronRight size={14} />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
        {ready && shown.length > 0 && <Pager page={page} pages={pages} onPage={setPage} total={list.length} label="conversations" />}
      </div>
    </>
  );
}

export default function QueuePage() {
  return (
    <Suspense fallback={null}>
      <Queue />
    </Suspense>
  );
}
