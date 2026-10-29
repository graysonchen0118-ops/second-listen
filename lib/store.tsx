"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { seedConversations } from "./mock/conversations";
import { seedAlerts, seedHealth } from "./mock/health";
import { seedCalItems, seedRulings, seedTests } from "./mock/calibration";
import type { Alert, CalItem, Conversation, DayStat, DisputeState, MyReview, Ruling, RunResult, TestCase } from "./mock/types";
import { pulse } from "./bus";

export const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface Toast {
  id: number;
  text: string;
  tone: "ok" | "info" | "error";
}

interface Data {
  convs: Conversation[];
  health: DayStat[];
  alerts: Alert[];
  cal: CalItem[];
  rulings: Ruling[];
  tests: TestCase[];
}

interface Store extends Data {
  toasts: Toast[];
  toast: (text: string, tone?: Toast["tone"]) => void;
  saveReview: (id: string, r: Omit<MyReview, "reviewedAt" | "dispute">) => Promise<void>;
  setDispute: (id: string, d: DisputeState) => Promise<void>;
  setAlert: (id: string, status: Alert["status"]) => Promise<void>;
  recheckAccount: (id: string) => Promise<void>;
  addCal: (item: Omit<CalItem, "id" | "status" | "added">) => Promise<string>;
  setProposal: (id: string, p: CalItem["proposal"]) => void;
  removeCal: (id: string) => void;
  rule: (itemId: string, r: Pick<Ruling, "ruling" | "reason" | "outcome" | "decidedBy">) => Promise<string>;
  addTest: (t: Omit<TestCase, "id" | "runs" | "status" | "created"> & { lines: string[] }) => Promise<string>;
  updateTest: (id: string, patch: Partial<Pick<TestCase, "title" | "scenario" | "expected" | "ticket" | "channel" | "topic">>) => Promise<void>;
  deleteTest: (id: string) => Promise<void>;
  setRun: (id: string, n: number, result: RunResult) => void;
  setRunLine: (id: string, n: number, line: string) => void;
}

const Ctx = createContext<Store | null>(null);

export const runStatus = (runs: TestCase["runs"]): TestCase["status"] => {
  const done = runs.filter((r) => r.result !== "pending");
  if (done.length === 0) return "draft";
  if (done.length < runs.length) return "running";
  return runs.some((r) => r.result === "fail") ? "failed" : "passed";
};

let seq = 1;

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<Data>(() => ({
    convs: seedConversations(),
    health: seedHealth(),
    alerts: seedAlerts(),
    cal: seedCalItems(),
    rulings: seedRulings(),
    tests: seedTests(),
  }));
  const [toasts, setToasts] = useState<Toast[]>([]);
  const failedOnce = useRef(new Set<string>());

  const toast = useCallback((text: string, tone: Toast["tone"] = "ok") => {
    const id = seq++;
    setToasts((t) => [...t.slice(-2), { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3600);
  }, []);

  const saveReview = useCallback<Store["saveReview"]>(async (id, r) => {
    await wait(650);
    setData((d) => ({
      ...d,
      convs: d.convs.map((c) =>
        c.id === id
          ? { ...c, review: { ...r, reviewedAt: "Oct 29, " + new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }), dispute: r.stance === "dispute" ? (c.review.dispute ?? "open") : undefined } }
          : c,
      ),
    }));
    pulse({ kind: "verdict", tone: r.status === "pass" ? "ok" : "err" });
  }, []);

  const setDispute = useCallback<Store["setDispute"]>(async (id, dispute) => {
    await wait(450);
    setData((d) => ({ ...d, convs: d.convs.map((c) => (c.id === id ? { ...c, review: { ...c.review, dispute } } : c)) }));
    pulse({ kind: "verdict", tone: dispute === "vendor-accepted" ? "ok" : "warn" });
  }, []);

  const setAlert = useCallback<Store["setAlert"]>(async (id, status) => {
    await wait(500);
    setData((d) => ({ ...d, alerts: d.alerts.map((a) => (a.id === id ? { ...a, status } : a)) }));
    pulse({ kind: "alert", tone: status === "reported" ? "warn" : "info" });
  }, []);

  const recheckAccount = useCallback<Store["recheckAccount"]>(async (id) => {
    await wait(900);
    // the account system times out the first time, like it does on a busy morning
    if (!failedOnce.current.has(id)) {
      failedOnce.current.add(id);
      throw new Error("The account system didn't answer in time.");
    }
  }, []);

  const addCal = useCallback<Store["addCal"]>(async (item) => {
    await wait(500);
    const id = `CAL-${65 + seq++}`;
    setData((d) => ({ ...d, cal: [...d.cal, { ...item, id, status: "open", added: "Oct 29" }] }));
    pulse({ kind: "ruling", tone: "info" });
    return id;
  }, []);

  const setProposal = useCallback<Store["setProposal"]>((id, proposal) => {
    setData((d) => ({ ...d, cal: d.cal.map((c) => (c.id === id ? { ...c, proposal } : c)) }));
  }, []);

  const removeCal = useCallback<Store["removeCal"]>((id) => {
    setData((d) => ({ ...d, cal: d.cal.filter((c) => c.id !== id) }));
  }, []);

  const rule = useCallback<Store["rule"]>(async (itemId, r) => {
    await wait(600);
    const id = `R-${49 + seq++}`;
    setData((d) => {
      const item = d.cal.find((c) => c.id === itemId);
      if (!item) return d;
      const ruling: Ruling = { id, date: "2026-10-29", convId: item.convId, topic: item.topic, ...r };
      return { ...d, cal: d.cal.map((c) => (c.id === itemId ? { ...c, status: "ruled" } : c)), rulings: [ruling, ...d.rulings] };
    });
    pulse({ kind: "ruling", tone: "ok" });
    return id;
  }, []);

  const addTest = useCallback<Store["addTest"]>(async (t) => {
    await wait(550);
    const id = `T-${119 + seq++}`;
    const { lines, ...rest } = t;
    const tc: TestCase = { ...rest, id, created: "Oct 29", status: "draft", runs: lines.map((line, i) => ({ n: i + 1, line, result: "pending" })) };
    setData((d) => ({ ...d, tests: [tc, ...d.tests] }));
    pulse({ kind: "run", tone: "info" });
    return id;
  }, []);

  const updateTest = useCallback<Store["updateTest"]>(async (id, patch) => {
    await wait(400);
    setData((d) => ({ ...d, tests: d.tests.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
  }, []);

  const deleteTest = useCallback<Store["deleteTest"]>(async (id) => {
    await wait(400);
    setData((d) => ({ ...d, tests: d.tests.filter((t) => t.id !== id) }));
  }, []);

  const setRun = useCallback<Store["setRun"]>((id, n, result) => {
    setData((d) => ({
      ...d,
      tests: d.tests.map((t) => {
        if (t.id !== id) return t;
        const runs = t.runs.map((r) => (r.n === n ? { ...r, result } : r));
        return { ...t, runs, status: runStatus(runs) };
      }),
    }));
    if (result !== "pending") pulse({ kind: "run", tone: result === "pass" ? "ok" : "err" });
  }, []);

  const setRunLine = useCallback<Store["setRunLine"]>((id, n, line) => {
    setData((d) => ({ ...d, tests: d.tests.map((t) => (t.id === id ? { ...t, runs: t.runs.map((r) => (r.n === n ? { ...r, line } : r)) } : t)) }));
  }, []);

  const value = useMemo<Store>(
    () => ({ ...data, toasts, toast, saveReview, setDispute, setAlert, recheckAccount, addCal, setProposal, removeCal, rule, addTest, updateTest, deleteTest, setRun, setRunLine }),
    [data, toasts, toast, saveReview, setDispute, setAlert, recheckAccount, addCal, setProposal, removeCal, rule, addTest, updateTest, deleteTest, setRun, setRunLine],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("store missing");
  return s;
}

/** shows a skeleton for a moment whenever the key changes, the way a real fetch would */
export function useLatency(key: string, ms = 380) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(false);
    const t = setTimeout(() => setReady(true), ms);
    return () => clearTimeout(t);
  }, [key, ms]);
  return ready;
}
