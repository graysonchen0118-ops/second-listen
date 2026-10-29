"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { Turn } from "@/lib/mock/types";
import { cssVar, damp, labelTexture, mount, softShadow } from "./kit";

// The conversation as a ribbon in depth: the assistant's turns in teal, the consumer's in indigo,
// silence flat and grey. Every cue stands up out of the ribbon as a beacon at the second it was
// said, amber when the bot stepped over it and green when it caught it. The playhead walks along
// it, and a saved verdict drops onto the ribbon as a token.

interface Props {
  turns: Turn[];
  duration: number;
  /** current playback second, written by the player */
  time: { current: number };
  verdict: "pass" | "fail" | "todo";
  stampKey: number;
  onSeek: (sec: number) => void;
}

const L = 15;
const N = 150;

export default function Waveform({ turns, duration, time, verdict, stampKey, onSeek }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const verdictRef = useRef({ verdict, stampKey });
  verdictRef.current = { verdict, stampKey };
  const seekRef = useRef(onSeek);
  seekRef.current = onSeek;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const st = mount(el, "__fpsWave");
    if (!st) return;
    const { scene, reduce } = st;
    const accent = new THREE.Color(cssVar("--accent", "#0b7285")).lerp(new THREE.Color(0x5fd0d8), 0.35);
    const support = new THREE.Color(cssVar("--support", "#4c5fd5")).lerp(new THREE.Color(0xaab4ff), 0.2);
    const quiet = new THREE.Color(0x3d5568);
    const cueC = new THREE.Color(cssVar("--cue", "#d9861a"));
    const okC = new THREE.Color(cssVar("--ok", "#1e9467"));
    const errC = new THREE.Color(cssVar("--err", "#cf3f5b"));

    const cam = new THREE.PerspectiveCamera(32, 1, 0.1, 80);
    scene.add(new THREE.HemisphereLight(0xe8fbff, 0x0c1a29, 1.7));
    const key = new THREE.DirectionalLight(0xffffff, 1.3);
    key.position.set(3, 8, 6);
    scene.add(key);
    const disposables: { dispose: () => void }[] = [];

    const root = new THREE.Group();
    scene.add(root);
    const base = new THREE.Mesh(new THREE.BoxGeometry(L + 0.8, 0.08, 1.5), new THREE.MeshLambertMaterial({ color: 0x18324a }));
    base.position.y = -0.04;
    root.add(base);
    const sh = softShadow(L + 3, 3.2, 0.6, "2,8,14");
    sh.position.y = -0.5;
    root.add(sh);

    // who is speaking at each slice of time
    const spans = turns.map((t, i) => ({ who: t.who, from: t.t, to: i + 1 < turns.length ? turns[i + 1].t : duration }));
    const whoAt = (sec: number) => {
      for (const s of spans) if (sec >= s.from && sec < s.to) return s;
      return spans[spans.length - 1];
    };
    const bars = new THREE.InstancedMesh(new THREE.BoxGeometry(L / N * 0.62, 1, 0.5), new THREE.MeshLambertMaterial({ color: 0xffffff }), N);
    bars.frustumCulled = false;
    const amp: number[] = [];
    const tint: THREE.Color[] = [];
    for (let i = 0; i < N; i++) {
      const sec = ((i + 0.5) / N) * duration;
      const sp = whoAt(sec);
      const into = sec - sp.from;
      const speaking = sp.who !== "system" && into < Math.max(2.5, (sp.to - sp.from) * 0.8);
      const a = speaking ? 0.45 + Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.43)) * (sp.who === "bot" ? 1.35 : 1.75) : 0.05;
      amp.push(a);
      tint.push(speaking ? (sp.who === "bot" ? accent : support) : quiet);
    }
    bars.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(N * 3), 3);
    root.add(bars);

    // cue beacons
    const beacons: { m: THREE.Group; t: number }[] = [];
    turns.forEach((tn) => {
      if (!tn.cue) return;
      const x = (tn.t / duration - 0.5) * L;
      const col = tn.cue.handled ? okC : cueC;
      const g = new THREE.Group();
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.3, 8), new THREE.MeshBasicMaterial({ color: col }));
      pole.position.y = 1.15;
      g.add(pole);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), new THREE.MeshBasicMaterial({ color: col }));
      cap.position.y = 2.3;
      g.add(cap);
      const text = tn.cue.type === "hardship" ? "Hardship" : tn.cue.type === "dispute" ? "Dispute" : tn.cue.type === "cease" ? "Cease" : tn.cue.type === "attorney" ? "Attorney" : tn.cue.type === "bankruptcy" ? "Bankruptcy" : "Military";
      const lt = labelTexture(text + (tn.cue.handled ? ", caught" : ", missed"), { bg: tn.cue.handled ? "#1e9467" : "#d9861a", color: "#ffffff", w: 360, h: 80, size: 36, weight: 700 });
      disposables.push(lt);
      const lab = new THREE.Sprite(new THREE.SpriteMaterial({ map: lt, transparent: true, depthWrite: false }));
      lab.scale.set(2.2, 0.49, 1);
      lab.position.y = 2.75;
      g.add(lab);
      g.position.set(x, 0, 0.1);
      root.add(g);
      beacons.push({ m: g, t: tn.t });
    });

    // playhead
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.035, 2.1, 1.0), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 }));
    head.position.y = 1.0;
    root.add(head);
    const headGlow = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 2.1), new THREE.MeshBasicMaterial({ color: 0x7fd6dd, transparent: true, opacity: 0.18, depthWrite: false }));
    headGlow.position.set(0, 1.0, 0.3);
    root.add(headGlow);

    // the verdict token
    const passT = labelTexture("PASS", { bg: "#1e9467", color: "#ffffff", w: 256, h: 256, size: 70, radius: 128, weight: 800 });
    const failT = labelTexture("FAIL", { bg: "#cf3f5b", color: "#ffffff", w: 256, h: 256, size: 70, radius: 128, weight: 800 });
    disposables.push(passT, failT);
    const faceMat = new THREE.MeshBasicMaterial({ map: passT, transparent: true });
    const sideMat = new THREE.MeshLambertMaterial({ color: okC });
    const token = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.14, 40), [sideMat, faceMat, sideMat]);
    token.rotation.x = Math.PI / 2;
    token.visible = false;
    root.add(token);
    let tokenY = 6;
    let tokenV = 0;
    let lastStamp = -1;

    const resize = (w: number, h: number) => {
      cam.aspect = w / h;
      // fit the ribbon to about 88% of the canvas width, whatever the shape
      const d = Math.max(11, (L / 0.88) / (2 * Math.tan(THREE.MathUtils.degToRad(16)) * cam.aspect));
      cam.position.set(0, 2.4 + d * 0.06, d);
      cam.lookAt(0, 1.05, 0);
      cam.updateProjectionMatrix();
    };
    resize(st.size().w, st.size().h);
    st.onResize(resize);

    let px = 0;
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      px = ((e.clientX - r.left) / r.width) * 2 - 1;
    };
    // a click on the ribbon seeks there
    const ray = new THREE.Raycaster();
    const onClick = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), cam);
      const hit = ray.intersectObject(base, false)[0] ?? ray.intersectObject(bars, false)[0];
      if (hit) {
        const local = root.worldToLocal(hit.point.clone());
        seekRef.current(Math.max(0, Math.min(duration, (local.x / L + 0.5) * duration)));
      }
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("click", onClick);

    const m4 = new THREE.Matrix4();
    const c = new THREE.Color();
    st.loop((dt, t) => {
      const now = time.current;
      const hx = (now / duration - 0.5) * L;
      head.position.x = hx;
      headGlow.position.x = hx;
      root.rotation.y = damp(root.rotation.y, px * 0.16 - 0.08, 3, dt);
      root.rotation.x = 0.04;
      for (let i = 0; i < N; i++) {
        const x = ((i + 0.5) / N - 0.5) * L;
        const near = Math.max(0, 1 - Math.abs(x - hx) / 0.9);
        const live = reduce ? 0 : near * Math.sin(t * 14 + i) * 0.18;
        const hgt = Math.max(0.04, amp[i] * (1 + live));
        m4.makeScale(1, hgt, 1);
        m4.setPosition(x, hgt / 2, 0);
        bars.setMatrixAt(i, m4);
        const played = x <= hx;
        c.copy(tint[i]).multiplyScalar(played ? 1.15 : 0.62);
        bars.setColorAt(i, c);
      }
      bars.instanceMatrix.needsUpdate = true;
      if (bars.instanceColor) bars.instanceColor.needsUpdate = true;
      beacons.forEach((b) => {
        const reached = now >= b.t;
        const s = damp(b.m.scale.y, reached ? 1 : 0.75, 6, dt);
        b.m.scale.set(1, s, 1);
      });

      // the token drops when a verdict is saved, then floats
      const v = verdictRef.current;
      if (v.verdict !== "todo") {
        if (v.stampKey !== lastStamp) {
          lastStamp = v.stampKey;
          faceMat.map = v.verdict === "pass" ? passT : failT;
          faceMat.needsUpdate = true;
          sideMat.color.copy(v.verdict === "pass" ? okC : errC);
          token.visible = true;
          tokenY = v.stampKey === 0 ? 2.9 : 6.5;
          tokenV = 0;
        }
        const rest = 2.9;
        tokenV -= 22 * dt;
        tokenY += tokenV * dt;
        if (tokenY < rest) {
          tokenY = rest;
          tokenV = Math.abs(tokenV) > 1.2 ? -tokenV * 0.38 : 0;
        }
        token.position.set(L / 2 - 1.1, tokenY + (reduce ? 0 : Math.sin(t * 1.6) * 0.05), 0.2);
        token.rotation.z = reduce ? 0 : Math.sin(t * 0.9) * 0.25;
      } else {
        token.visible = false;
        lastStamp = -1;
      }
      st.renderer.render(scene, cam);
    });

    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("click", onClick);
      disposables.forEach((d) => d.dispose());
      st.dispose();
    };
  }, [turns, duration, time]);

  return <div ref={ref} style={{ position: "absolute", inset: 0, cursor: "pointer" }} />;
}
