"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BookOpenCheck, CalendarClock, Gavel, Loader2, Plus, Search, Trash2 } from "lucide-react";
import { useLatency, useStore } from "@/lib/store";
import { DECISION_LABEL, MEETING, TOPIC_LABEL } from "@/lib/mock/calibration";
import { TEAM, person } from "@/lib/mock/team";
import { WORK } from "@/lib/photos";
import { fullDate, shortDate } from "@/lib/format";
import type { CalItem, Decision, Topic } from "@/lib/mock/types";
import { Avatar, Empty, Modal, Photo, Skel, Tilt } from "@/components/ui";

export default function Calibration() {
  const s = useStore();
  const [ruleFor, setRuleFor] = useState<CalItem | null>(null);
  const [adding, setAdding] = useState(false);
  const [q, setQ] = useState("");
  const [topic, setTopic] = useState<Topic | "all">("all");
  const [fresh, setFresh] = useState<string | null>(null);
  const ready = useLatency(q + topic, 320);
  const open = s.cal.filter((c) => c.status === "open");
  const ruledToday = s.cal.filter((c) => c.status === "ruled");

  const log = useMemo(() => {
    const n = q.trim().toLowerCase();
    return s.rulings.filter((r) => (topic === "all" || r.topic === topic) && (!n || [r.ruling, r.reason, r.convId, r.decidedBy].join(" ").toLowerCase().includes(n)));
  }, [s.rulings, q, topic]);
  const topics = useMemo(() => Array.from(new Set(s.rulings.map((r) => r.topic))), [s.rulings]);

  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">Calibration</span>
          <h1>Gray areas, decided once</h1>
          <p>Every borderline call settled in the weekly meeting is written down with its reason, so the same case gets the same answer next month, from anyone on the team and from the vendor.</p>
        </div>
      </div>

      <div className="meeting">
        <Tilt className="meeting-photo" max={4}>
          <Photo id={WORK.meeting} w={900} h={520} alt="The QA team around a table, working through a case on a laptop" />
          <div className="cap">
            <strong>
              <CalendarClock size={15} style={{ verticalAlign: -2 }} /> {fullDate(MEETING.day)}, {MEETING.time}
            </strong>
            <div className="small" style={{ opacity: 0.85 }}>
              {MEETING.room} · {open.length} on the agenda
            </div>
          </div>
        </Tilt>
        <div className="card">
          <div className="card-head">
            <h3>In the room</h3>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {TEAM.filter((p) => p.id !== "tom").map((p) => (
              <div key={p.id} className="who-line">
                <Avatar id={p.photo} name={p.name} size={36} />
                <div>
                  <div className="strong">
                    {p.name}
                    {p.id === "me" ? " (you)" : ""}
                  </div>
                  <div className="small muted">{p.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="section">
        <div className="section-title">
          <h2>Agenda</h2>
          <button className="btn btn-primary btn-sm" onClick={() => setAdding(true)}>
            <Plus size={15} /> Add a case
          </button>
        </div>
        {open.length === 0 && ruledToday.length === 0 ? (
          <div className="card">
            <Empty icon={<Gavel size={24} />} title="Nothing on the agenda" text="Send a conversation to calibration from its review screen, or add a case here." />
          </div>
        ) : (
          <div className="agenda">
            {[...open, ...ruledToday].map((item, i) => {
              const p = person(item.raisedBy);
              return (
                <div key={item.id} className={`agenda-item ${item.status === "ruled" ? "ruled" : ""}`} style={{ animationDelay: `${i * 50}ms` }}>
                  <div className="top">
                    <span className="chip chip-dark">{item.id}</span>
                    <span className="chip chip-accent">{TOPIC_LABEL[item.topic]}</span>
                    <Link href={`/queue/${item.convId}`} className="small strong" style={{ color: "var(--accent)" }}>
                      {item.convId}
                    </Link>
                    <span className="small muted">added {item.added}</span>
                    {item.status === "ruled" && <span className="chip chip-ok">Ruled today</span>}
                  </div>
                  <p className="q">{item.question}</p>
                  <div className="bottom">
                    <span className="who-line">
                      {p && <Avatar id={p.photo} name={p.name} size={28} />}
                      Raised by {item.raisedBy}
                    </span>
                    {item.status === "open" && (
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                        <div className="seg" role="group" aria-label="Proposed outcome">
                          {(Object.keys(DECISION_LABEL) as Decision[]).map((d) => (
                            <button key={d} className={item.proposal === d ? "on" : ""} onClick={() => s.setProposal(item.id, d)}>
                              {DECISION_LABEL[d]}
                            </button>
                          ))}
                        </div>
                        <button className="btn btn-primary btn-sm" onClick={() => setRuleFor(item)}>
                          <Gavel size={15} /> Record ruling
                        </button>
                        <button
                          className="icon-btn"
                          aria-label={`Remove ${item.id}`}
                          onClick={() => {
                            s.removeCal(item.id);
                            s.toast(`${item.id} taken off the agenda.`, "info");
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="section card">
        <div className="card-head">
          <h3>
            <BookOpenCheck size={18} style={{ verticalAlign: -3 }} /> Rulings log
          </h3>
          <span className="small muted">{s.rulings.length} rulings since September</span>
        </div>
        <div className="filters" style={{ marginTop: 0, marginBottom: 12 }}>
          <div className="field" style={{ position: "relative" }}>
            <label htmlFor="r-q">Search the log</label>
            <input id="r-q" className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="A phrase, a call ID, a name" />
            <Search size={16} style={{ position: "absolute", right: 12, top: 38, color: "var(--muted)" }} />
          </div>
        </div>
        <div className="tabs" style={{ marginBottom: 6 }}>
          <button className={`tab ${topic === "all" ? "on" : ""}`} onClick={() => setTopic("all")}>
            All topics
          </button>
          {topics.map((t) => (
            <button key={t} className={`tab ${topic === t ? "on" : ""}`} onClick={() => setTopic(t)}>
              {TOPIC_LABEL[t]}
            </button>
          ))}
        </div>
        {!ready ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
            {[0, 1, 2, 3].map((i) => (
              <Skel key={i} h={58} r={12} />
            ))}
          </div>
        ) : log.length === 0 ? (
          <Empty icon={<Search size={24} />} title="No ruling matches" text="Nothing in the log uses those words. If the case is new, it belongs on the agenda." />
        ) : (
          <div className="log">
            {log.map((r) => {
              const p = person(r.decidedBy);
              return (
                <div key={r.id} className={`log-item ${fresh === r.id ? "fresh" : ""}`}>
                  <div className="d">
                    {shortDate(r.date)}
                    <div className="tiny">{r.id}</div>
                  </div>
                  <div>
                    <div className="rule">{r.ruling}</div>
                    <div className="why">{r.reason}</div>
                    <div className="meta">
                      <span className="chip chip-accent">{TOPIC_LABEL[r.topic]}</span>
                      <span className="chip">{DECISION_LABEL[r.outcome]}</span>
                      <Link href={`/queue/${r.convId}`} className="small" style={{ color: "var(--accent)" }}>
                        {r.convId}
                      </Link>
                      <span className="who-line small">
                        {p && <Avatar id={p.photo} name={p.name} size={22} />}
                        {r.decidedBy}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {ruleFor && (
        <RuleModal
          item={ruleFor}
          onClose={() => setRuleFor(null)}
          onDone={(id) => {
            setFresh(id);
            setQ("");
            setTopic("all");
          }}
        />
      )}
      <AddModal open={adding} onClose={() => setAdding(false)} />
    </>
  );
}

function RuleModal({ item, onClose, onDone }: { item: CalItem; onClose: () => void; onDone: (id: string) => void }) {
  const s = useStore();
  const [ruling, setRuling] = useState("");
  const [reason, setReason] = useState("");
  const [outcome, setOutcome] = useState<Decision>(item.proposal);
  const [by, setBy] = useState("Dana Whitfield");
  const [busy, setBusy] = useState(false);
  const [tried, setTried] = useState(false);
  const submit = async () => {
    setTried(true);
    if (!ruling.trim() || !reason.trim()) return;
    setBusy(true);
    const id = await s.rule(item.id, { ruling: ruling.trim(), reason: reason.trim(), outcome, decidedBy: by });
    setBusy(false);
    onClose();
    onDone(id);
    s.toast(`Ruling recorded for ${item.convId}. It is at the top of the log.`);
  };
  return (
    <Modal
      open
      title={`Ruling on ${item.id}`}
      onClose={onClose}
      foot={
        <>
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={submit} disabled={busy}>
            {busy ? <Loader2 size={16} className="spin" /> : <Gavel size={16} />} Record
          </button>
        </>
      }
    >
      <p className="small" style={{ color: "var(--ink-2)" }}>
        {item.question}
      </p>
      <div className="field">
        <label htmlFor="ru">The ruling, in one sentence</label>
        <input id="ru" className="input" value={ruling} onChange={(e) => setRuling(e.target.value)} placeholder="What counts, and what the bot should do" />
        {tried && !ruling.trim() && <span className="err">Write the ruling so the next reviewer can apply it.</span>}
      </div>
      <div className="field">
        <label htmlFor="re">Why</label>
        <textarea id="re" className="textarea" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="The reason is what keeps the next borderline case from being argued again" />
        {tried && !reason.trim() && <span className="err">A ruling without its reason gets argued again.</span>}
      </div>
      <div className="field">
        <span className="lbl">Outcome</span>
        <div className="seg" role="group" aria-label="Outcome">
          {(Object.keys(DECISION_LABEL) as Decision[]).map((d) => (
            <button key={d} className={outcome === d ? "on" : ""} onClick={() => setOutcome(d)}>
              {DECISION_LABEL[d]}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <label htmlFor="by">Decided by</label>
        <select id="by" className="select" value={by} onChange={(e) => setBy(e.target.value)}>
          {TEAM.filter((p) => p.team === "qa" || p.team === "compliance").map((p) => (
            <option key={p.id} value={p.name}>
              {p.name}, {p.role}
            </option>
          ))}
        </select>
      </div>
    </Modal>
  );
}

function AddModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const s = useStore();
  const [convId, setConvId] = useState(s.convs[0]?.id ?? "");
  const [topic, setTopic] = useState<Topic>("hardship");
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [tried, setTried] = useState(false);
  const submit = async () => {
    setTried(true);
    if (question.trim().length < 12) return;
    setBusy(true);
    const id = await s.addCal({ convId, topic, question: question.trim(), raisedBy: "Jordan Ellis", proposal: "calibration" });
    setBusy(false);
    setQuestion("");
    setTried(false);
    onClose();
    s.toast(`${id} added to the agenda.`);
  };
  return (
    <Modal
      open={open}
      title="Add a case to the agenda"
      onClose={onClose}
      foot={
        <>
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={submit} disabled={busy}>
            {busy ? <Loader2 size={16} className="spin" /> : <Plus size={16} />} Add
          </button>
        </>
      }
    >
      <div className="field">
        <label htmlFor="a-conv">Conversation</label>
        <select id="a-conv" className="select" value={convId} onChange={(e) => setConvId(e.target.value)}>
          {s.convs.map((c) => (
            <option key={c.id} value={c.id}>
              {c.id}, {shortDate(c.day)}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="a-topic">Topic</label>
        <select id="a-topic" className="select" value={topic} onChange={(e) => setTopic(e.target.value as Topic)}>
          {Object.entries(TOPIC_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="a-q">Question</label>
        <textarea id="a-q" className="textarea" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="The case, the way you would put it to the room" />
        {tried && question.trim().length < 12 && <span className="err">Write the question in a sentence or two.</span>}
      </div>
    </Modal>
  );
}
