"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AudioLines, ClipboardCheck, FlaskConical, Gauge, Headphones, ListChecks, Menu, Scale, Search, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { Avatar, Toasts } from "./ui";
import { TEAM } from "@/lib/mock/team";
import { fullDate } from "@/lib/format";
import { TODAY, hasSoftMiss } from "@/lib/mock/conversations";

const Backdrop = dynamic(() => import("./three/Backdrop"), { ssr: false, loading: () => <div className="backdrop-fallback" /> });

export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const s = useStore();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const me = TEAM[0];

  useEffect(() => setOpen(false), [path]);

  const todo = s.convs.filter((c) => c.review.status === "todo").length;
  const soft = s.convs.filter((c) => c.review.status === "todo" && hasSoftMiss(c)).length;
  const openDisputes = s.convs.filter((c) => c.review.dispute === "open").length;
  const openCal = s.cal.filter((c) => c.status === "open").length;
  const running = s.tests.filter((t) => t.status === "running" || t.status === "draft").length;

  const links = [
    { href: "/", label: "Today", icon: <Gauge size={19} />, n: soft, cue: true },
    { href: "/queue", label: "Review queue", icon: <Headphones size={19} />, n: todo },
    { href: "/vendor", label: "Vendor audit", icon: <ClipboardCheck size={19} />, n: openDisputes },
    { href: "/calibration", label: "Calibration", icon: <Scale size={19} />, n: openCal },
    { href: "/tests", label: "Test runs", icon: <FlaskConical size={19} />, n: running },
  ];
  const on = (h: string) => (h === "/" ? path === "/" : path.startsWith(h));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/queue?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <div className="app">
      <div className="backdrop-layer" aria-hidden="true">
        <Backdrop />
      </div>
      <aside className={`sidebar ${open ? "open" : ""}`} aria-label="Main navigation">
        <div className="brand">
          <span className="brand-mark">
            <AudioLines size={20} color="#fff" />
          </span>
          <div>
            <strong>Second Listen</strong>
            <span>Conversation QA</span>
          </div>
          <button className="icon-btn menu-btn" style={{ marginLeft: "auto", color: "#fff" }} onClick={() => setOpen(false)} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>
        <nav className="nav">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className={on(l.href) ? "on" : ""}>
              {l.icon}
              {l.label}
              {l.n > 0 && <span className={`count ${l.cue ? "cue" : ""}`}>{l.n}</span>}
            </Link>
          ))}
        </nav>
        <div className="side-foot">
          <Avatar id={me.photo} name={me.name} size={36} />
          <div>
            <strong>{me.name}</strong>
            <span>{me.role}</span>
          </div>
          <ListChecks size={18} style={{ marginLeft: "auto", color: "#8fa4b5" }} />
        </div>
      </aside>
      <div className={`scrim ${open ? "show" : ""}`} onClick={() => setOpen(false)} />
      <div className="main">
        <header className="topbar">
          <button className="icon-btn menu-btn" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu size={20} />
          </button>
          <div className="when">
            {fullDate(TODAY)} <span>· Eastern</span>
          </div>
          <form className="search" onSubmit={submit} role="search">
            <Search size={17} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search ID, name, creditor or a phrase" aria-label="Search conversations" />
          </form>
        </header>
        <main className="content">{children}</main>
        <footer className="footer">
          <span>© 2026 Second Listen. Consumer names, accounts and amounts are invented.</span>
          <span>Photos: Unsplash</span>
        </footer>
      </div>
      <Toasts />
    </div>
  );
}
