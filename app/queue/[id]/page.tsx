"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, ClipboardList, FlaskConical, Loader2, Pause, Play, RefreshCw, Scale, SearchX } from "lucide-react";
import { useStore } from "@/lib/store";
import { CHECKS, CUE_LABEL, cuesOf, hasMismatch } from "@/lib/mock/conversations";
import { DECISION_LABEL, TOPIC_LABEL } from "@/lib/mock/calibration";
import { clock, dur, money, ordinal, shortDate } from "@/lib/format";
import type { CheckId, Conversation, Decision, Mark, PayTerms, Stance, Topic } from "@/lib/mock/types";
import { ChannelIcon, Empty, Modal, OutcomeChip, Verdict } from "@/components/ui";

const Waveform = dynamic(() => import("@/components/three/Waveform"), { ssr: false, loading: () => <div className="wave-still" /> });

export default function ReviewPage() {
  const { id } = useParams<{ id: string }>();
  const s = useStore();
  const c = s.convs.find((x) => x.id === decodeURIComponent(id));
  if (!c)
    return (
      <div className="card">
        <Empty
          icon={<SearchX size={24} />}
          title="That conversation isn't in the sample"
          text="It may belong to a day that was not sampled. Search the queue for it instead."
          action={
            <Link className="btn btn-ghost btn-sm" href="/queue">
              Back to the queue
            </Link>
          }
        />
      </div>
    );
  return <Review key={c.id} c={c} />;
}

const MARKS: { m: Mark; label: string }[] = [
  { m: "ok", label: "OK" },
  { m: "miss", label: "Miss" },
  { m: "na", label: "N/A" },
];

function Review({ c }: { c: Conversation }) {
  const s = useStore();
  const reviewed = c.review.status !== "todo";
  const [checks, setChecks] = useState<Record<CheckId, Mark>>(reviewed ? c.review.checks : c.suggested);
  const suggestedStatus = Object.values(checks).includes("miss") ? "fail" : "pass";
  const [status, setStatus] = useState<"pass" | "fail">(reviewed ? (c.review.status as "pass" | "fail") : suggestedStatus);
  const [statusTouched, setStatusTouched] = useState(reviewed);
  const [stance, setStance] = useState<Stance>(c.review.stance ?? (status === c.vendor.verdict ? "confirm" : "dispute"));
  const [stanceTouched, setStanceTouched] = useState(reviewed);
  const [reason, setReason] = useState(c.review.reason ?? "");
  const [note, setNote] = useState(c.review.note ?? "");
  const [saving, setSaving] = useState(false);
  const [tried, setTried] = useState(false);
  const [stampKey, setStampKey] = useState(0);

  // the checklist drives the suggested verdict until the reviewer picks one
  useEffect(() => {
    if (!statusTouched) setStatus(suggestedStatus);
  }, [suggestedStatus, statusTouched]);
  useEffect(() => {
    if (!stanceTouched) setStance(status === c.vendor.verdict ? "confirm" : "dispute");
  }, [status, stanceTouched, c.vendor.verdict]);

  // playback
  const duration = c.durationSec;
  const rate = c.channel === "chat" ? 8 : 1;
  const time = useRef({ current: 0 });
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  useEffect(() => {
    if (!playing) return;
    const iv = setInterval(() => {
      const next = Math.min(duration, time.current.current + 0.1 * speed * rate);
      time.current.current = next;
      setT(next);
      if (next >= duration) setPlaying(false);
    }, 100);
    return () => clearInterval(iv);
  }, [playing, speed, rate, duration]);
  const seek = (sec: number) => {
    time.current.current = sec;
    setT(sec);
  };
  const nowTurn = useMemo(() => {
    let k = 0;
    c.transcript.forEach((tn, i) => {
      if (tn.t <= t) k = i;
    });
    return k;
  }, [t, c.transcript]);
  const listRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!playing) return;
    const el = listRef.current?.querySelector(`[data-turn="${nowTurn}"]`) as HTMLElement | null;
    const box = listRef.current;
    if (el && box) box.scrollTo({ top: el.offsetTop - box.offsetTop - 60, behavior: "smooth" });
  }, [nowTurn, playing]);

  // account system re-read, which can time out
  const [acct, setAcct] = useState<"idle" | "loading" | "error" | "ok">("idle");
  const recheck = async () => {
    setAcct("loading");
    try {
      await s.recheckAccount(c.id);
      setAcct("ok");
    } catch {
      setAcct("error");
    }
  };

  const save = async () => {
    setTried(true);
    if (stance === "dispute" && !reason.trim()) return;
    setSaving(true);
    await s.saveReview(c.id, { status, stance, reason: stance === "dispute" ? reason.trim() : undefined, checks, note: note.trim() });
    setSaving(false);
    setStampKey((k) => k + 1);
    s.toast(stance === "dispute" ? `Saved as ${status}. The vendor score is disputed and listed in Vendor audit.` : `Saved as ${status}, vendor score confirmed.`, "ok");
  };

  // neighbours in the queue
  const idx = s.convs.findIndex((x) => x.id === c.id);
  const prev = s.convs[idx - 1];
  const next = s.convs[idx + 1];
  const nextTodo = s.convs.find((x, i) => i > idx && x.review.status === "todo") ?? s.convs.find((x) => x.review.status === "todo" && x.id !== c.id);

  const cues = cuesOf(c);
  const diffs = CHECKS.filter((k) => c.vendor.criteria[k.id] !== checks[k.id] && !(c.vendor.criteria[k.id] === "na" || checks[k.id] === "na"));
  const [calOpen, setCalOpen] = useState(false);
  const [testOpen, setTestOpen] = useState(false);
  const current = s.convs.find((x) => x.id === c.id) ?? c;

  return (
    <>
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/queue">Review queue</Link>
        <span>/</span>
        <span>{c.id}</span>
        <span style={{ marginLeft: "auto", display: "inline-flex", gap: 8 }}>
          {prev && (
            <Link className="btn btn-ghost btn-sm" href={`/queue/${prev.id}`} aria-label="Previous conversation">
              <ArrowLeft size={15} /> {prev.id}
            </Link>
          )}
          {next && (
            <Link className="btn btn-ghost btn-sm" href={`/queue/${next.id}`} aria-label="Next conversation">
              {next.id} <ArrowRight size={15} />
            </Link>
          )}
        </span>
      </nav>

      <div className="card" style={{ animation: "fadeUp .45s ease both" }}>
        <div className="card-head" style={{ marginBottom: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <ChannelIcon channel={c.channel} size={19} />
            <div>
              <h1 style={{ fontSize: 24 }}>{c.id}</h1>
              <span className="muted small">
                {c.channel === "voice" ? "Inbound call" : "Web chat"}, {shortDate(c.day)} at {clock(c.minute)} ET · release {c.release}
              </span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <OutcomeChip outcome={c.outcome} />
            <Verdict v={current.review.status} label={current.review.status === "todo" ? undefined : "You:"} />
          </div>
        </div>
        <div className="review-head">
          <div>
            <div className="k">Consumer</div>
            <div className="v">{c.outcome === "silent" ? "Unknown caller" : `${c.consumer.name}, ${c.consumer.state}`}</div>
          </div>
          <div>
            <div className="k">Account</div>
            <div className="v">{c.outcome === "silent" ? "Not identified" : `${c.account.creditor}`}</div>
            {c.outcome !== "silent" && <div className="small muted">{c.account.kind}, {money(c.account.balance)}</div>}
          </div>
          <div>
            <div className="k">Length</div>
            <div className="v mono">{dur(c.durationSec)}</div>
          </div>
          <div>
            <div className="k">Bot summary</div>
            <div className="small">{c.summaryText}</div>
          </div>
        </div>
      </div>

      <div className="review-grid">
        <div className="card">
          <div className="card-head">
            <h3>{c.channel === "voice" ? "The call" : "The chat"}</h3>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {cues.map((q) => (
                <span key={q.turn} className={`chip ${q.handled ? "chip-ok" : "chip-cue"}`}>
                  {CUE_LABEL[q.type]}, {q.handled ? "caught" : "missed"}
                </span>
              ))}
              {c.silenceSec ? <span className="chip">{c.silenceSec}s of silence</span> : null}
            </div>
          </div>
          <div className="wave">
            <Waveform turns={c.transcript} duration={duration} time={time.current} verdict={current.review.status} stampKey={stampKey} onSeek={seek} />
          </div>
          <div className="player">
            <button className="play" onClick={() => (t >= duration ? (seek(0), setPlaying(true)) : setPlaying((p) => !p))} aria-label={playing ? "Pause" : "Play"}>
              {playing ? <Pause size={20} /> : <Play size={20} style={{ marginLeft: 2 }} />}
            </button>
            <span className="mono small">
              {dur(t)} / {dur(duration)}
            </span>
            <input className="scrub" type="range" min={0} max={duration} step={0.5} value={t} onChange={(e) => seek(Number(e.target.value))} aria-label="Position" />
            <div className="seg" role="group" aria-label="Speed">
              {[1, 1.5, 2].map((x) => (
                <button key={x} className={speed === x ? "on" : ""} onClick={() => setSpeed(x)}>
                  {x}x
                </button>
              ))}
            </div>
          </div>
          {c.channel === "chat" && <p className="tiny muted" style={{ marginTop: 6 }}>Chat replays faster than real time, with the typing gaps kept in proportion.</p>}
          <div className="transcript" ref={listRef} style={{ maxHeight: 560, overflow: "auto" }}>
            {c.transcript.map((tn, i) => {
              const at = tn.cue ? tn.text.indexOf(tn.cue.phrase) : -1;
              return (
                <div key={i} data-turn={i} className={`turn ${tn.who} ${i === nowTurn && (playing || t > 0) ? "now" : ""}`} onClick={() => seek(tn.t)}>
                  <span className="ts">{dur(tn.t)}</span>
                  <div>
                    <div className="bubble">
                      {tn.who !== "system" && <span className="who">{tn.who === "bot" ? "Assistant" : "Consumer"}</span>}
                      {at >= 0 && tn.cue ? (
                        <>
                          {tn.text.slice(0, at)}
                          <mark className={tn.cue.handled ? "handled" : ""}>{tn.cue.phrase}</mark>
                          {tn.text.slice(at + tn.cue.phrase.length)}
                        </>
                      ) : (
                        tn.text
                      )}
                    </div>
                    {tn.cue && (
                      <span className={`cue-note ${tn.cue.handled ? "handled" : ""}`}>
                        {tn.cue.handled ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                        {CUE_LABEL[tn.cue.type]} cue, {tn.cue.handled ? "the assistant caught it" : "the assistant went on as if it wasn't said"}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="side-stack">
          {c.said && <PaymentCheck c={c} acct={acct} onRecheck={recheck} />}

          <div className="card">
            <div className="card-head">
              <h3>SOP checklist</h3>
              <span className="small muted">{reviewed ? "Your saved checks" : "Prefilled from the transcript"}</span>
            </div>
            <div className="checks">
              {CHECKS.map((k) => (
                <div key={k.id} className="check">
                  <span className="t">{k.label}</span>
                  <div className="seg" role="group" aria-label={k.label}>
                    {MARKS.map((m) => (
                      <button key={m.m} className={checks[k.id] === m.m ? `on ${m.m === "ok" ? "ok" : m.m === "miss" ? "err" : "na"}` : ""} onClick={() => setChecks((x) => ({ ...x, [k.id]: m.m }))} aria-pressed={checks[k.id] === m.m}>
                        {m.label}
                      </button>
                    ))}
                  </div>
                  <span className="h">{k.hint}</span>
                  {c.vendor.criteria[k.id] !== checks[k.id] && c.vendor.criteria[k.id] !== "na" && checks[k.id] !== "na" && (
                    <span className="diff">Vendor marked this {c.vendor.criteria[k.id] === "ok" ? "OK" : "a miss"}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <h3>Vendor score</h3>
              <span className="small muted">{c.vendor.by}</span>
            </div>
            <div className="verdict-row">
              <div>
                <div className="score mono">{c.vendor.score}</div>
                <Verdict v={c.vendor.verdict} label="Vendor" />
              </div>
              <p className="small" style={{ flex: 1, minWidth: 180, color: "var(--ink-2)" }}>
                &ldquo;{c.vendor.note}&rdquo;
              </p>
            </div>
            {diffs.length > 0 && (
              <p className="small" style={{ marginTop: 12, color: "#9a5b08", fontWeight: 600 }}>
                Your checklist and the vendor grid disagree on {diffs.length === 1 ? "one point" : `${diffs.length} points`}: {diffs.map((d) => d.label.toLowerCase()).join("; ")}.
              </p>
            )}
          </div>

          <div className="card">
            <div className="card-head">
              <h3>Your verdict</h3>
              {current.review.reviewedAt && <span className="small muted">Saved {current.review.reviewedAt}</span>}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="verdict-row">
                <span className="strong small">This conversation</span>
                <div className="seg" role="group" aria-label="Pass or fail">
                  <button
                    className={status === "pass" ? "on ok" : ""}
                    onClick={() => {
                      setStatus("pass");
                      setStatusTouched(true);
                    }}
                  >
                    Pass
                  </button>
                  <button
                    className={status === "fail" ? "on err" : ""}
                    onClick={() => {
                      setStatus("fail");
                      setStatusTouched(true);
                    }}
                  >
                    Fail
                  </button>
                </div>
              </div>
              <div className="verdict-row">
                <span className="strong small">The vendor&apos;s score</span>
                <div className="seg" role="group" aria-label="Confirm or dispute">
                  <button
                    className={stance === "confirm" ? "on" : ""}
                    onClick={() => {
                      setStance("confirm");
                      setStanceTouched(true);
                    }}
                  >
                    Confirm
                  </button>
                  <button
                    className={stance === "dispute" ? "on err" : ""}
                    onClick={() => {
                      setStance("dispute");
                      setStanceTouched(true);
                    }}
                  >
                    Dispute
                  </button>
                </div>
              </div>
              {stance === "dispute" && (
                <div className="field">
                  <label htmlFor="reason">Why the vendor score is wrong</label>
                  <textarea id="reason" className="textarea" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="What was said, at what second, and which SOP point it touches" />
                  {tried && !reason.trim() && <span className="err">A dispute needs a reason the vendor can act on.</span>}
                </div>
              )}
              <div className="field">
                <label htmlFor="note">Note for the QA lead (optional)</label>
                <input id="note" className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anything worth raising in calibration" />
              </div>
              <button className="btn btn-primary" onClick={save} disabled={saving}>
                {saving ? <Loader2 size={17} className="spin" /> : <CheckCircle2 size={17} />}
                {saving ? "Saving" : reviewed || stampKey ? "Update verdict" : "Save verdict"}
              </button>
              {(reviewed || stampKey > 0) && nextTodo && (
                <Link className="btn btn-ghost" href={`/queue/${nextTodo.id}`}>
                  Next to review: {nextTodo.id} <ArrowRight size={16} />
                </Link>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <h3>Follow-through</h3>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              <button className="btn btn-ghost" onClick={() => setCalOpen(true)}>
                <Scale size={16} /> Send to calibration
              </button>
              <button className="btn btn-ghost" onClick={() => setTestOpen(true)}>
                <FlaskConical size={16} /> Open a ticket and test it
              </button>
            </div>
          </div>
        </div>
      </div>
      <CalModal c={c} open={calOpen} onClose={() => setCalOpen(false)} />
      <TestModal c={c} open={testOpen} onClose={() => setTestOpen(false)} />
    </>
  );
}

function PaymentCheck({ c, acct, onRecheck }: { c: Conversation; acct: "idle" | "loading" | "error" | "ok"; onRecheck: () => void }) {
  const said = c.said as PayTerms;
  const sum = c.summary as PayTerms;
  const rec = c.record as PayTerms;
  const rows: { label: string; get: (p: PayTerms) => string }[] = [
    { label: c.outcome === "plan" ? "Monthly amount" : "Amount", get: (p) => money(p.amount) },
    { label: c.outcome === "plan" ? "First payment" : "Payment date", get: (p) => shortDate(p.date) },
    { label: "Card", get: (p) => `ending ${p.card}` },
  ];
  if (c.outcome === "plan") rows.push({ label: "Payments", get: (p) => String(p.count ?? "") });
  const bad = hasMismatch(c);
  return (
    <div className="card">
      <div className="card-head">
        <h3>Payment check</h3>
        {bad ? <span className="chip chip-err">Account doesn&apos;t match</span> : <span className="chip chip-ok">All three match</span>}
      </div>
      <div className="table-wrap">
        <table className="compare">
          <thead>
            <tr>
              <th></th>
              <th>Consumer said</th>
              <th>Bot summary</th>
              <th>Account record</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label}>
                <td className="small muted">{r.label}</td>
                <td>{r.get(said)}</td>
                <td className={r.get(sum) !== r.get(said) ? "bad" : ""}>{r.get(sum)}</td>
                <td className={r.get(rec) !== r.get(said) ? "bad" : ""}>{r.get(rec)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {bad && (
        <p className="small" style={{ marginTop: 10, color: "var(--ink-2)" }}>
          The summary agrees with the consumer, the account doesn&apos;t. Whoever works this account next sees the record, not the call.
        </p>
      )}
      <div style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <button className="btn btn-ghost btn-sm" onClick={onRecheck} disabled={acct === "loading"}>
          {acct === "loading" ? <Loader2 size={15} className="spin" /> : <RefreshCw size={15} />}
          {acct === "error" ? "Try again" : "Re-read the account system"}
        </button>
        {acct === "ok" && <span className="small" style={{ color: "var(--ok)", fontWeight: 600 }}>Re-read just now, same values.</span>}
      </div>
      {acct === "error" && (
        <div className="errbox" style={{ marginTop: 10 }} role="alert">
          <AlertCircle size={17} />
          The account system didn&apos;t answer in time. Nothing was changed, try again in a moment.
        </div>
      )}
    </div>
  );
}

function CalModal({ c, open, onClose }: { c: Conversation; open: boolean; onClose: () => void }) {
  const s = useStore();
  const cue = cuesOf(c)[0];
  const defTopic: Topic = cue ? cue.type : hasMismatch(c) ? "payments" : c.outcome === "silent" ? "silence" : c.suggested.identity === "miss" ? "identity" : c.suggested.disclosure === "miss" ? "disclosure" : "payments";
  const [topic, setTopic] = useState<Topic>(defTopic);
  const [question, setQuestion] = useState(cue ? `The consumer said "${cue.phrase}" and the assistant ${cue.handled ? "caught it" : "went on to the payment"}. Pass or fail, and does the manual cover it?` : "");
  const [proposal, setProposal] = useState<Decision>("calibration");
  const [busy, setBusy] = useState(false);
  const [tried, setTried] = useState(false);
  const submit = async () => {
    setTried(true);
    if (question.trim().length < 12) return;
    setBusy(true);
    const id = await s.addCal({ convId: c.id, topic, question: question.trim(), raisedBy: "Jordan Ellis", proposal });
    setBusy(false);
    onClose();
    s.toast(`Added to Thursday's calibration agenda as ${id}.`);
  };
  return (
    <Modal
      open={open}
      title="Send to calibration"
      onClose={onClose}
      foot={
        <>
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={submit} disabled={busy}>
            {busy ? <Loader2 size={16} className="spin" /> : <ClipboardList size={16} />} Add to agenda
          </button>
        </>
      }
    >
      <p className="small muted">It goes on the agenda for the weekly calibration, with {c.id} linked.</p>
      <div className="field">
        <label htmlFor="cal-topic">Topic</label>
        <select id="cal-topic" className="select" value={topic} onChange={(e) => setTopic(e.target.value as Topic)}>
          {Object.entries(TOPIC_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="cal-q">The question for the room</label>
        <textarea id="cal-q" className="textarea" value={question} onChange={(e) => setQuestion(e.target.value)} />
        {tried && question.trim().length < 12 && <span className="err">Write the question the way you would ask it in the meeting.</span>}
      </div>
      <div className="field">
        <span className="lbl">What you think it needs</span>
        <div className="seg" role="group" aria-label="Proposal">
          {(Object.keys(DECISION_LABEL) as Decision[]).map((d) => (
            <button key={d} className={proposal === d ? "on" : ""} onClick={() => setProposal(d)}>
              {DECISION_LABEL[d]}
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}

function TestModal({ c, open, onClose }: { c: Conversation; open: boolean; onClose: () => void }) {
  const s = useStore();
  const cue = cuesOf(c)[0];
  // run 1 starts from the consumer's own words: the cue, or the line where they agreed to the date
  const dayWord = c.said ? ordinal(Number(c.said.date.slice(8))) : "";
  const dateTurn = c.said ? c.transcript.find((x) => x.who === "consumer" && (x.text.toLowerCase().includes(dayWord) || x.text.includes(String(Number(c.said!.date.slice(8)))))) : undefined;
  const line = cue ? c.transcript[cue.turn].text : (dateTurn?.text ?? "");
  const silent = c.outcome === "silent";
  const [title, setTitle] = useState(cue ? `${CUE_LABEL[cue.type]} said in passing is recognized` : hasMismatch(c) ? "Account record matches the read-back" : silent ? "Silent caller hears a prompt in time" : "");
  const [expected, setExpected] = useState(
    cue
      ? cue.type === "hardship"
        ? "The assistant acknowledges it and offers the hardship path before any plan amount."
        : cue.type === "dispute"
          ? "The assistant notes the dispute and does not take a payment in that conversation."
          : "The assistant recognizes it, stops the payment ask and routes it as the manual says."
      : hasMismatch(c)
        ? "The amount and first payment date in the account equal what was read back to the consumer."
        : silent
          ? "The assistant prompts within 5 seconds, again at 15, and ends at 30 with a line about calling back."
          : "",
  );
  const [busy, setBusy] = useState(false);
  const [tried, setTried] = useState(false);
  const submit = async () => {
    setTried(true);
    if (!title.trim() || !expected.trim()) return;
    setBusy(true);
    const id = await s.addTest({
      ticket: `QA-${413 + Math.floor(Math.random() * 40)}`,
      title: title.trim(),
      channel: c.channel,
      topic: cue ? cue.type : hasMismatch(c) ? "payments" : "silence",
      scenario: line ? `Consumer says something like: "${line}"` : `Same path as ${c.id}.`,
      expected: expected.trim(),
      owner: "Jordan Ellis",
      convId: c.id,
      lines: [line || "", "", "", "", "", "", "", "", "", ""],
    });
    setBusy(false);
    onClose();
    s.toast(`${id} created with 10 runs. Record the results in Test runs.`);
  };
  return (
    <Modal
      open={open}
      title="Open a ticket and a test"
      onClose={onClose}
      foot={
        <>
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={submit} disabled={busy}>
            {busy ? <Loader2 size={16} className="spin" /> : <FlaskConical size={16} />} Create
          </button>
        </>
      }
    >
      <p className="small muted">The ticket goes to the developers, and the test case waits in Test runs with 10 runs ready for the fix.</p>
      <div className="field">
        <label htmlFor="t-title">Test case</label>
        <input id="t-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
        {tried && !title.trim() && <span className="err">Name what is being tested.</span>}
      </div>
      <div className="field">
        <label htmlFor="t-exp">Expected behavior</label>
        <textarea id="t-exp" className="textarea" value={expected} onChange={(e) => setExpected(e.target.value)} />
        {tried && !expected.trim() && <span className="err">Say what the assistant should do, so a run can pass or fail.</span>}
      </div>
      {line && (
        <p className="small" style={{ color: "var(--ink-2)" }}>
          Run 1 starts from the consumer&apos;s own words in {c.id}.
        </p>
      )}
    </Modal>
  );
}
