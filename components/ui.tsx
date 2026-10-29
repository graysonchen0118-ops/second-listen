"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Info, MessageSquareText, Phone, TriangleAlert, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { photo } from "@/lib/photos";
import type { Channel, MyStatus, Outcome } from "@/lib/mock/types";

export function Toasts() {
  const { toasts } = useStore();
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.tone}`}>
          {t.tone === "ok" ? <CheckCircle2 size={18} /> : t.tone === "error" ? <TriangleAlert size={18} /> : <Info size={18} />}
          <span>{t.text}</span>
        </div>
      ))}
    </div>
  );
}

export function Photo({ id, w, h, alt, className, eager }: { id: string; w: number; h: number; alt: string; className?: string; eager?: boolean }) {
  const [ok, setOk] = useState(false);
  return (
    <img
      src={photo(id, w, h)}
      width={w}
      height={h}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      className={`photo ${ok ? "photo-ok" : ""} ${className ?? ""}`}
      onLoad={() => setOk(true)}
    />
  );
}

export function Avatar({ id, name, size = 36 }: { id: string; name: string; size?: number }) {
  return <img src={photo(id, size * 2, size * 2, true)} width={size} height={size} alt={name} title={name} className="avatar" style={{ width: size, height: size }} loading="lazy" />;
}

/** inline skeleton, a span so it is safe inside text */
export function Skel({ h = 14, w = "100%", r = 8 }: { h?: number; w?: number | string; r?: number }) {
  return <span className="skel" style={{ height: h, width: w, borderRadius: r }} aria-hidden="true" />;
}

/** leans a passive card toward the pointer, with the light following. Never wrap a form in it. */
export function Tilt({ children, className, max = 6 }: { children: React.ReactNode; className?: string; max?: number }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const move = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el || e.pointerType !== "mouse") return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty("--rx", `${(-y * max).toFixed(2)}deg`);
    el.style.setProperty("--ry", `${(x * max).toFixed(2)}deg`);
    el.style.setProperty("--lx", `${((x + 0.5) * 100).toFixed(0)}%`);
    el.style.setProperty("--ly", `${((y + 0.5) * 100).toFixed(0)}%`);
  };
  const leave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  };
  return (
    <div ref={ref} className={`tilt ${className ?? ""}`} onPointerMove={move} onPointerLeave={leave}>
      {children}
    </div>
  );
}

export function Modal({ open, title, onClose, children, width = 560, foot }: { open: boolean; title: string; onClose: () => void; children: React.ReactNode; width?: number; foot?: React.ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="modal-layer" onClick={onClose}>
      <div className="modal" style={{ maxWidth: width }} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal-head">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </header>
        <div className="modal-body">{children}</div>
        {foot && <footer className="modal-foot">{foot}</footer>}
      </div>
    </div>
  );
}

export function Empty({ icon, title, text, action }: { icon: React.ReactNode; title: string; text: string; action?: React.ReactNode }) {
  return (
    <div className="empty">
      <span className="empty-ic">{icon}</span>
      <strong>{title}</strong>
      <p>{text}</p>
      {action}
    </div>
  );
}

export function Pager({ page, pages, onPage, total, label }: { page: number; pages: number; onPage: (n: number) => void; total: number; label: string }) {
  return (
    <div className="pager">
      <span className="muted small">{pages > 1 ? `Page ${page} of ${pages}, ` : ""}{total} {label}</span>
      {pages > 1 && (
        <div className="pager-btns">
          <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
            Previous
          </button>
          <button className="btn btn-ghost btn-sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>
            Next
          </button>
        </div>
      )}
    </div>
  );
}

export function ChannelIcon({ channel, size = 17 }: { channel: Channel; size?: number }) {
  return <span className={`ch-ic ${channel}`}>{channel === "voice" ? <Phone size={size} /> : <MessageSquareText size={size} />}</span>;
}

export const OUTCOME_LABEL: Record<Outcome, string> = {
  payment: "Paid in full",
  plan: "Plan set up",
  promise: "Promise to pay",
  info: "Information",
  transfer: "Transferred",
  dropped: "Dropped",
  silent: "Silent call",
};

export function OutcomeChip({ outcome }: { outcome: Outcome }) {
  const cls = outcome === "payment" || outcome === "plan" ? "chip-accent" : outcome === "silent" || outcome === "dropped" ? "chip" : "chip-support";
  return <span className={`chip ${cls}`}>{OUTCOME_LABEL[outcome]}</span>;
}

export function Verdict({ v, label }: { v: "pass" | "fail" | MyStatus; label?: string }) {
  if (v === "todo") return <span className="chip">To review</span>;
  return <span className={`chip ${v === "pass" ? "chip-ok" : "chip-err"}`}>{label ? `${label} ` : ""}{v === "pass" ? "Pass" : "Fail"}</span>;
}
