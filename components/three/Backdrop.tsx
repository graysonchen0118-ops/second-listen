"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { onPulse, type Tone } from "@/lib/bus";
import { cssVar, damp, mount, rounded } from "./kit";

// Behind every page: transcript cards and call waveforms floating at different depths. The near
// ones slide past faster as the page scrolls, the far ones barely move, and the pointer leans the
// whole field. When a verdict, a run or a ruling is saved, a ripple runs through the cards in
// that result's colour.

type Kind = "chat" | "chat2" | "voice" | "cue";

function cardTexture(kind: Kind, accent: string, support: string, cue: string) {
  const W = 320;
  const H = 200;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  rounded(g, 4, 4, W - 8, H - 8, 26);
  g.fillStyle = "rgba(255,255,255,0.96)";
  g.fill();
  g.lineWidth = 2;
  g.strokeStyle = "rgba(14,28,43,0.08)";
  g.stroke();
  if (kind === "voice") {
    // a call: two speakers' waveforms
    for (let i = 0; i < 46; i++) {
      const x = 24 + i * 6;
      const env = Math.abs(Math.sin(i * 0.37) * Math.cos(i * 0.11));
      const hgt = 10 + env * 70;
      g.fillStyle = i % 17 < 9 ? accent : support;
      g.globalAlpha = 0.85;
      rounded(g, x, H / 2 - hgt / 2, 3.4, hgt, 1.7);
      g.fill();
    }
    g.globalAlpha = 1;
    g.fillStyle = "rgba(14,28,43,0.18)";
    rounded(g, 24, H - 34, 120, 8, 4);
    g.fill();
  } else {
    // a chat: bubbles left and right
    const rows = kind === "chat2" ? [0.62, 0.4, 0.7, 0.32] : [0.5, 0.72, 0.38, 0.6];
    rows.forEach((wf, i) => {
      const bot = i % 2 === 0;
      const bw = (W - 64) * wf;
      const x = bot ? 22 : W - 22 - bw;
      const y = 22 + i * 42;
      rounded(g, x, y, bw, 30, 14);
      g.fillStyle = bot ? "rgba(11,114,133,0.13)" : "rgba(76,95,213,0.13)";
      g.fill();
      g.fillStyle = bot ? "rgba(11,114,133,0.55)" : "rgba(76,95,213,0.55)";
      rounded(g, x + 12, y + 12, bw * 0.6, 6, 3);
      g.fill();
      if (kind === "cue" && i === 1) {
        g.fillStyle = cue;
        g.globalAlpha = 0.85;
        rounded(g, x + 12, y + 10, bw * 0.42, 10, 5);
        g.fill();
        g.globalAlpha = 1;
      }
    });
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export default function Backdrop() {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const st = mount(el, "__fpsBackdrop");
    if (!st) return;
    const { scene, small, reduce } = st;
    const accent = cssVar("--accent", "#0b7285");
    const support = cssVar("--support", "#4c5fd5");
    const cue = cssVar("--cue", "#d9861a");
    scene.fog = new THREE.Fog(0xf2f5f6, 12, 34);

    const cam = new THREE.PerspectiveCamera(42, 1, 0.1, 80);
    cam.position.set(0, 0, 14);

    const kinds: Kind[] = ["chat", "voice", "chat2", "cue"];
    const textures = Object.fromEntries(kinds.map((k) => [k, cardTexture(k, accent, support, cue)])) as unknown as Record<Kind, THREE.Texture>;
    const geo = new THREE.PlaneGeometry(3.2, 2);

    interface Card {
      m: THREE.Mesh;
      mat: THREE.MeshBasicMaterial;
      base: THREE.Vector3;
      phase: number;
      spin: number;
      kick: number;
      kickAt: number;
    }
    const cards: Card[] = [];
    const n = small ? 12 : 22;
    let seed = 7;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (let i = 0; i < n; i++) {
      const kind = kinds[i % kinds.length];
      const mat = new THREE.MeshBasicMaterial({ map: textures[kind], transparent: true, opacity: 0.5 + rnd() * 0.35, depthWrite: false, side: THREE.DoubleSide });
      const m = new THREE.Mesh(geo, mat);
      const z = -2 - rnd() * 16;
      const spread = 9 + -z * 0.55;
      const base = new THREE.Vector3((rnd() * 2 - 1) * spread, 6 - rnd() * 44, z);
      // keep the middle column calmer, where the text sits
      if (Math.abs(base.x) < 3.5) base.x += base.x < 0 ? -3.5 : 3.5;
      m.position.copy(base);
      const s = 0.7 + rnd() * 0.6;
      m.scale.set(s, s, s);
      m.rotation.set((rnd() - 0.5) * 0.5, (rnd() - 0.5) * 0.7, (rnd() - 0.5) * 0.25);
      scene.add(m);
      cards.push({ m, mat, base, phase: rnd() * Math.PI * 2, spin: (rnd() - 0.5) * 0.25, kick: 0, kickAt: 0 });
    }

    const resize = (w: number, h: number) => {
      cam.aspect = w / h;
      cam.updateProjectionMatrix();
    };
    resize(st.size().w, st.size().h);
    st.onResize(resize);

    let px = 0;
    let py = 0;
    const onMove = (e: PointerEvent) => {
      px = (e.clientX / window.innerWidth) * 2 - 1;
      py = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    const tones: Record<Tone, THREE.Color> = {
      ok: new THREE.Color(cssVar("--ok", "#1e9467")),
      err: new THREE.Color(cssVar("--err", "#cf3f5b")),
      warn: new THREE.Color(cue),
      info: new THREE.Color(accent),
    };
    let clock = 0;
    let tint = new THREE.Color(1, 1, 1);
    let pulseT = -10;
    const off = onPulse((p) => {
      tint = tones[p.tone];
      pulseT = clock;
      cards.forEach((c) => {
        c.kick = 1;
        c.kickAt = clock + Math.abs(c.base.x) * 0.05 + Math.abs(c.base.z) * 0.03;
      });
    });

    let camY = 0;
    const white = new THREE.Color(1, 1, 1);
    st.loop((dt, t) => {
      clock = t;
      const target = -window.scrollY * 0.012;
      camY = damp(camY, target, 4, dt);
      cam.position.x = damp(cam.position.x, px * 0.8, 2.5, dt);
      cam.position.y = camY - py * 0.5;
      cam.lookAt(cam.position.x * 0.4, camY, 0);
      const since = t - pulseT;
      for (const c of cards) {
        const drift = reduce ? 0 : Math.sin(t * 0.35 + c.phase) * 0.25;
        c.m.position.y = c.base.y + drift;
        if (!reduce) c.m.rotation.y += c.spin * dt * 0.2;
        // the ripple: a quick lean and a tint, reaching far cards later
        const k = c.kick && t > c.kickAt ? Math.max(0, 1 - (t - c.kickAt) / 1.2) : 0;
        if (c.kick && t > c.kickAt + 1.2) c.kick = 0;
        c.m.rotation.x = Math.sin(k * Math.PI) * 0.6 + Math.sin(t * 0.2 + c.phase) * 0.05;
        c.mat.color.copy(white).lerp(tint, since < 2.2 ? k * 0.75 : 0);
      }
      st.renderer.render(scene, cam);
    });

    return () => {
      off();
      window.removeEventListener("pointermove", onMove);
      Object.values(textures).forEach((x) => x.dispose());
      st.dispose();
    };
  }, []);

  return <div ref={ref} style={{ position: "absolute", inset: 0 }} />;
}
