"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, ClipboardCheck, Loader2, Undo2 } from "lucide-react";
import { useLatency, useStore } from "@/lib/store";
import { CHECKS } from "@/lib/mock/conversations";
import { clock, shortDate } from "@/lib/format";
import type { DisputeState } from "@/lib/mock/types";
import { Avatar, ChannelIcon, Empty, Skel, Verdict } from "@/components/ui";
import { person } from "@/lib/mock/team";

type Tab = "open" | "resolved" | "all";

export default function VendorAudit() {
  const s = useStore();
  const [tab, setTab] = useState<Tab>("open");
  const [busy, setBusy] = useState<string | null>(null);
  const ready = useLatency(tab, 380);
  const audited = s.convs.filter((c) => c.review.status !== "todo");
  const agree = audited.filter((c) => c.review.stance === "confirm").length;
  const disputes = s.convs.filter((c) => c.review.stance === "dispute");
  const open = disputes.filter((c) => c.review.dispute === "open");
  const waiting = s.convs.filter((c) => c.review.status === "todo").length;
  const marcus = person("Marcus Bell");

  // per checklist point: how often the vendor's grid matches the reviewer's checks
  const byPoint = useMemo(
    () =>
      CHECKS.filter((k) => k.id !== "account" && k.id !== "recording").map((k) => {
        const rel = audited.filter((c) => c.review.checks[k.id] !== "na" && c.vendor.criteria[k.id] !== "na");
        const same = rel.filter((c) => c.review.checks[k.id] === c.vendor.criteria[k.id]).length;
        return { ...k, n: rel.length, rate: rel.length ? Math.round((same / rel.length) * 100) : 100 };
      }),
    [audited],
  );

  const rows = tab === "open" ? open : tab === "resolved" ? disputes.filter((c) => c.review.dispute !== "open") : disputes;
  const resolve = async (id: string, d: DisputeState) => {
    setBusy(id + d);
    await s.setDispute(id, d);
    setBusy(null);
    s.toast(d === "vendor-accepted" ? `${id}: the vendor accepted the correction.` : d === "vendor-upheld" ? `${id}: the vendor kept its score. It goes to calibration.` : `${id} reopened.`, d === "vendor-upheld" ? "info" : "ok");
  };

  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">Vendor audit</span>
          <h1>Every vendor score gets a second opinion</h1>
          <p>Confirm or dispute each pass and fail the vendor sent, with the reason written where they can act on it.</p>
        </div>
        {marcus && (
          <div className="who-line">
            <Avatar id={marcus.photo} name={marcus.name} size={40} />
            <div>
              <div className="strong">{marcus.name}</div>
              <div className="small muted">Vendor QA contact</div>
            </div>
          </div>
        )}
      </div>

      <div className="grid kpis">
        {[
          { label: "Audited by QA", v: audited.length, sub: `${waiting} still waiting` },
          { label: "Agreement with vendor", v: `${audited.length ? Math.round((agree / audited.length) * 100) : 0}%`, sub: `${agree} of ${audited.length} confirmed` },
          { label: "Open disputes", v: open.length, sub: "waiting on the vendor" },
          { label: "Vendor accepted", v: disputes.filter((c) => c.review.dispute === "vendor-accepted").length, sub: "scores corrected" },
        ].map((k, i) => (
          <div key={k.label} className="card kpi" style={{ cursor: "default", animation: `fadeUp .45s ease ${i * 50}ms both` }}>
            <span className="k-label">{k.label}</span>
            <div className="k-value mono">{k.v}</div>
            <div className="small muted">{k.sub}</div>
          </div>
        ))}
      </div>

      <div className="section grid cols-2">
        <div className="card">
          <div className="card-head">
            <h3>Where the vendor grid and QA disagree</h3>
          </div>
          <p className="small muted" style={{ marginBottom: 14 }}>
            Share of audited conversations where the vendor marked the point the same way QA did.
          </p>
          <div className="bars">
            {byPoint.map((b) => (
              <div key={b.id} className="bar-row">
                <span>{b.label}</span>
                <div className="bar-track" role="img" aria-label={`${b.rate}% agreement`}>
                  <div className={`bar-fill ${b.rate < 80 ? "low" : ""}`} style={{ width: `${b.rate}%` }} />
                </div>
                <span className="mono strong" style={{ textAlign: "right" }}>
                  {b.rate}%
                </span>
              </div>
            ))}
          </div>
          <p className="small" style={{ marginTop: 14, color: "var(--ink-2)" }}>
            Each review you save moves these bars.{" "}
            <Link href="/queue?view=todo" style={{ color: "var(--accent)", fontWeight: 600 }}>
              Review the next one
            </Link>
          </p>
        </div>

        <div className="card">
          <div className="card-head">
            <h3>Disputes</h3>
            <div className="seg" role="group" aria-label="Dispute filter">
              {(["open", "resolved", "all"] as Tab[]).map((t) => (
                <button key={t} className={tab === t ? "on" : ""} onClick={() => setTab(t)}>
                  {t === "open" ? "Open" : t === "resolved" ? "Resolved" : "All"}
                </button>
              ))}
            </div>
          </div>
          {!ready ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[0, 1, 2].map((i) => (
                <Skel key={i} h={64} r={12} />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <Empty icon={<ClipboardCheck size={24} />} title={tab === "open" ? "No open disputes" : "Nothing here yet"} text="Dispute a vendor score from a conversation and it shows up here with your reason." />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {rows.map((c) => (
                <div key={c.id} className="alert" style={{ background: "#fff" }}>
                  <ChannelIcon channel={c.channel} />
                  <div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                      <Link href={`/queue/${c.id}`} className="strong" style={{ color: "var(--accent)" }}>
                        {c.id}
                      </Link>
                      <span className="small muted">
                        {shortDate(c.day)}, {clock(c.minute)}
                      </span>
                      <Verdict v={c.vendor.verdict} label="Vendor" />
                      <Verdict v={c.review.status} label="QA" />
                      {c.review.dispute !== "open" && <span className={`chip ${c.review.dispute === "vendor-accepted" ? "chip-ok" : "chip-warn"}`}>{c.review.dispute === "vendor-accepted" ? "Vendor accepted" : "Vendor kept score"}</span>}
                    </div>
                    <p>{c.review.reason || "No reason written."}</p>
                    <div className="alert-actions">
                      {c.review.dispute === "open" ? (
                        <>
                          <button className="btn btn-primary btn-sm" disabled={!!busy} onClick={() => resolve(c.id, "vendor-accepted")}>
                            {busy === c.id + "vendor-accepted" ? <Loader2 size={14} className="spin" /> : <Check size={14} />} Vendor accepted
                          </button>
                          <button className="btn btn-ghost btn-sm" disabled={!!busy} onClick={() => resolve(c.id, "vendor-upheld")}>
                            Vendor kept its score
                          </button>
                        </>
                      ) : (
                        <button className="btn btn-ghost btn-sm" disabled={!!busy} onClick={() => resolve(c.id, "open")}>
                          <Undo2 size={14} /> Reopen
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
