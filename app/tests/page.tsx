"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, Download, FlaskConical, Loader2, Minus, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { runStatus, useLatency, useStore } from "@/lib/store";
import { TOPIC_LABEL } from "@/lib/mock/calibration";
import { person } from "@/lib/mock/team";
import type { Channel, RunResult, TestCase, Topic } from "@/lib/mock/types";
import { Avatar, ChannelIcon, Empty, Modal, Skel } from "@/components/ui";

type Filter = "all" | "draft" | "running" | "passed" | "failed";
const STATUS_LABEL: Record<TestCase["status"], string> = { draft: "Not started", running: "Running", passed: "Ready for release", failed: "Failed" };
const STATUS_CHIP: Record<TestCase["status"], string> = { draft: "chip", running: "chip chip-support", passed: "chip chip-ok", failed: "chip chip-err" };
const NEXT: Record<RunResult, RunResult> = { pending: "pass", pass: "fail", fail: "pending" };

export default function Tests() {
  const s = useStore();
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<TestCase | null>(null);
  const [creating, setCreating] = useState(false);
  const [removing, setRemoving] = useState<TestCase | null>(null);
  const ready = useLatency(filter + q, 340);

  const list = useMemo(() => {
    const n = q.trim().toLowerCase();
    return s.tests.filter((t) => (filter === "all" || runStatus(t.runs) === filter) && (!n || [t.id, t.ticket, t.title, t.scenario, ...t.runs.map((r) => r.line)].join(" ").toLowerCase().includes(n)));
  }, [s.tests, filter, q]);
  const count = (f: Filter) => (f === "all" ? s.tests.length : s.tests.filter((t) => runStatus(t.runs) === f).length);

  const exportCsv = (t: TestCase) => {
    const rows = [["Test", "Ticket", "Run", "What the consumer says", "Result"], ...t.runs.map((r) => [t.id, t.ticket, String(r.n), r.line, r.result])];
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${t.id}-${t.ticket}-runs.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    s.toast(`${t.id} exported for Excel.`);
  };

  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">Test runs</span>
          <h1>Fixes tested before they go live</h1>
          <p>Each fix gets a test case and ten runs, every run in the words a consumer would actually use. Click a result to mark it, click a line to rewrite it.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setCreating(true)}>
          <Plus size={16} /> New test case
        </button>
      </div>

      <div className="card" style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
        <div className="tabs">
          {(["all", "running", "draft", "failed", "passed"] as Filter[]).map((f) => (
            <button key={f} className={`tab ${filter === f ? "on" : ""}`} onClick={() => setFilter(f)}>
              {f === "all" ? "All" : STATUS_LABEL[f]}
              <span className="tab-n">{count(f)}</span>
            </button>
          ))}
        </div>
        <div style={{ position: "relative", flex: "1 1 220px", maxWidth: 320 }}>
          <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tests and run lines" aria-label="Search tests" style={{ paddingRight: 36 }} />
          <Search size={16} style={{ position: "absolute", right: 12, top: 13, color: "var(--muted)" }} />
        </div>
      </div>

      <div className="section" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {!ready ? (
          [0, 1].map((i) => <Skel key={i} h={220} r={18} />)
        ) : list.length === 0 ? (
          <div className="card">
            <Empty icon={<FlaskConical size={24} />} title="No test case here" text="Open one from a conversation, or start a new one for a fix the developers shipped." />
          </div>
        ) : (
          list.map((t, i) => {
            const st = runStatus(t.runs);
            const pass = t.runs.filter((r) => r.result === "pass").length;
            const fail = t.runs.filter((r) => r.result === "fail").length;
            const owner = person(t.owner);
            return (
              <article key={t.id} className="card test" style={{ animation: `fadeUp .4s ease ${i * 50}ms both` }}>
                <div className="test-head">
                  <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <ChannelIcon channel={t.channel} />
                    <div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                        <span className="small muted strong">
                          {t.id} · {t.ticket}
                        </span>
                        <span className={STATUS_CHIP[st]}>{STATUS_LABEL[st]}</span>
                        <span className="chip chip-accent">{TOPIC_LABEL[t.topic]}</span>
                      </div>
                      <h3 style={{ marginTop: 4 }}>{t.title}</h3>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    {owner && <Avatar id={owner.photo} name={owner.name} size={30} />}
                    <button className="icon-btn" onClick={() => exportCsv(t)} aria-label={`Export ${t.id}`} title="Export for Excel">
                      <Download size={17} />
                    </button>
                    <button className="icon-btn" onClick={() => setEditing(t)} aria-label={`Edit ${t.id}`} title="Edit">
                      <Pencil size={17} />
                    </button>
                    <button className="icon-btn" onClick={() => setRemoving(t)} aria-label={`Delete ${t.id}`} title="Delete">
                      <Trash2 size={17} />
                    </button>
                  </div>
                </div>
                <div className="test-body">
                  <p>
                    <span className="strong" style={{ color: "var(--ink)" }}>Scenario.</span> {t.scenario}
                  </p>
                  <p>
                    <span className="strong" style={{ color: "var(--ink)" }}>Expected.</span> {t.expected}
                  </p>
                </div>
                <div className="progress" aria-label={`${pass} passed, ${fail} failed, ${10 - pass - fail} to run`}>
                  <span style={{ width: `${pass * 10}%`, background: "var(--ok)" }} />
                  <span style={{ width: `${fail * 10}%`, background: "var(--err)" }} />
                </div>
                <div className="small muted" style={{ marginTop: 6 }}>
                  {pass} passed, {fail} failed, {t.runs.length - pass - fail} to run
                  {t.convId && (
                    <>
                      {" "}· from{" "}
                      <Link href={`/queue/${t.convId}`} style={{ color: "var(--accent)", fontWeight: 600 }}>
                        {t.convId}
                      </Link>
                    </>
                  )}
                </div>
                <div className="runs">
                  {t.runs.map((r) => (
                    <div key={r.n} className={`run ${r.result}`}>
                      <span className="n">{r.n}</span>
                      <textarea rows={2} value={r.line} onChange={(e) => s.setRunLine(t.id, r.n, e.target.value)} placeholder="How else would someone say it?" aria-label={`Run ${r.n} line`} />
                      <button className="res" onClick={() => s.setRun(t.id, r.n, NEXT[r.result])} aria-label={`Run ${r.n}: ${r.result}. Change`} title="Pending, pass, fail">
                        {r.result === "pass" ? <Check size={16} /> : r.result === "fail" ? <X size={16} /> : <Minus size={16} color="var(--muted)" />}
                      </button>
                    </div>
                  ))}
                </div>
              </article>
            );
          })
        )}
      </div>

      {(creating || editing) && <TestForm test={editing} onClose={() => (setCreating(false), setEditing(null))} />}
      {removing && (
        <Modal
          open
          title={`Delete ${removing.id}?`}
          onClose={() => setRemoving(null)}
          width={440}
          foot={
            <>
              <button className="btn btn-ghost" onClick={() => setRemoving(null)}>
                Keep it
              </button>
              <button
                className="btn btn-danger"
                onClick={async () => {
                  const id = removing.id;
                  setRemoving(null);
                  await s.deleteTest(id);
                  s.toast(`${id} deleted.`, "info");
                }}
              >
                <Trash2 size={16} /> Delete
              </button>
            </>
          }
        >
          <p>The test case and its ten runs go away. The ticket {removing.ticket} stays open with the developers.</p>
        </Modal>
      )}
    </>
  );
}

function TestForm({ test, onClose }: { test: TestCase | null; onClose: () => void }) {
  const s = useStore();
  const [title, setTitle] = useState(test?.title ?? "");
  const [ticket, setTicket] = useState(test?.ticket ?? `QA-${414 + s.tests.length}`);
  const [channel, setChannel] = useState<Channel>(test?.channel ?? "voice");
  const [topic, setTopic] = useState<Topic>(test?.topic ?? "hardship");
  const [scenario, setScenario] = useState(test?.scenario ?? "");
  const [expected, setExpected] = useState(test?.expected ?? "");
  const [busy, setBusy] = useState(false);
  const [tried, setTried] = useState(false);
  const ok = title.trim() && scenario.trim() && expected.trim();
  const submit = async () => {
    setTried(true);
    if (!ok) return;
    setBusy(true);
    if (test) {
      await s.updateTest(test.id, { title: title.trim(), ticket, channel, topic, scenario: scenario.trim(), expected: expected.trim() });
      s.toast(`${test.id} updated.`);
    } else {
      const id = await s.addTest({ title: title.trim(), ticket, channel, topic, scenario: scenario.trim(), expected: expected.trim(), owner: "Jordan Ellis", lines: Array(10).fill("") });
      s.toast(`${id} created with 10 runs.`);
    }
    setBusy(false);
    onClose();
  };
  return (
    <Modal
      open
      title={test ? `Edit ${test.id}` : "New test case"}
      onClose={onClose}
      width={600}
      foot={
        <>
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={submit} disabled={busy}>
            {busy ? <Loader2 size={16} className="spin" /> : <Check size={16} />} {test ? "Save" : "Create"}
          </button>
        </>
      }
    >
      <div className="field">
        <label htmlFor="tf-title">What is being tested</label>
        <input id="tf-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
        {tried && !title.trim() && <span className="err">Give the test a name.</span>}
      </div>
      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
        <div className="field">
          <label htmlFor="tf-ticket">Ticket</label>
          <input id="tf-ticket" className="input" value={ticket} onChange={(e) => setTicket(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="tf-ch">Channel</label>
          <select id="tf-ch" className="select" value={channel} onChange={(e) => setChannel(e.target.value as Channel)}>
            <option value="voice">Voice</option>
            <option value="chat">Chat</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="tf-topic">Topic</label>
          <select id="tf-topic" className="select" value={topic} onChange={(e) => setTopic(e.target.value as Topic)}>
            {Object.entries(TOPIC_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="field">
        <label htmlFor="tf-sc">Scenario</label>
        <textarea id="tf-sc" className="textarea" value={scenario} onChange={(e) => setScenario(e.target.value)} placeholder="Where in the conversation, and what the consumer says" />
        {tried && !scenario.trim() && <span className="err">Describe the scenario.</span>}
      </div>
      <div className="field">
        <label htmlFor="tf-ex">Expected behavior</label>
        <textarea id="tf-ex" className="textarea" value={expected} onChange={(e) => setExpected(e.target.value)} placeholder="What the assistant has to do for a run to pass" />
        {tried && !expected.trim() && <span className="err">Without it, no run can pass or fail.</span>}
      </div>
    </Modal>
  );
}
