"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { currentFocus, onFocus, onPulse, type DialFocus } from "@/lib/bus";
import { photo } from "@/lib/photos";
import { cssVar, damp, labelTexture, mount, softShadow } from "./kit";

// Yesterday as a 24 hour dial. Around the rim, one tile per conversation in this morning's sample,
// stacked at the hour it happened. Inside, two rings of columns show the whole day's volume, calls
// and chats. Wins are teal. The wins that carry a hardship or dispute cue look teal too, the way
// they do on the dashboard, with only an amber edge and a faint glow giving them away.

export type TileCat = "soft" | "win" | "other" | "quiet" | "fail";
export interface DialTile {
  id: string;
  minute: number;
  cat: TileCat;
  groups: DialFocus[];
}
export interface DialMoment {
  id: string;
  hour: number;
  label: string;
}
export interface HoverInfo {
  id: string;
  x: number;
  y: number;
}

interface Props {
  tiles: DialTile[];
  voice: number[];
  chat: number[];
  moments: DialMoment[];
  dayLabel: string;
  onPick: (id: string) => void;
  onHover: (h: HoverInfo | null) => void;
}

const R_TILE = 6.85;
const hourAngle = (minute: number) => (minute / 1440) * Math.PI * 2;
const HOUR_TEXT = ["12 AM", "", "", "3 AM", "", "", "6 AM", "", "", "9 AM", "", "", "12 PM", "", "", "3 PM", "", "", "6 PM", "", "", "9 PM", "", ""];

export default function DayDial({ tiles, voice, chat, moments, dayLabel, onPick, onHover }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const cb = useRef({ onPick, onHover });
  cb.current = { onPick, onHover };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const st = mount(el, "__fpsDial");
    if (!st) return;
    const { scene, reduce } = st;
    const accent = new THREE.Color(cssVar("--accent", "#0b7285"));
    const support = new THREE.Color(cssVar("--support", "#4c5fd5"));
    const cue = new THREE.Color(cssVar("--cue", "#d9861a"));

    const cam = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    scene.add(new THREE.HemisphereLight(0xdff6ff, 0x0c1a29, 1.6));
    const key = new THREE.DirectionalLight(0xffffff, 1.5);
    key.position.set(5, 12, 8);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x7fd6dd, 0.7);
    rim.position.set(-8, 4, -8);
    scene.add(rim);

    const dial = new THREE.Group();
    scene.add(dial);
    const disposables: { dispose: () => void }[] = [];

    // platform
    const plat = new THREE.Mesh(new THREE.CylinderGeometry(6.1, 6.35, 0.36, 72), new THREE.MeshLambertMaterial({ color: 0x173750 }));
    plat.position.y = 0;
    dial.add(plat);
    const top = new THREE.Mesh(new THREE.CircleGeometry(6.08, 72).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0x1c4360 }));
    top.position.y = 0.181;
    dial.add(top);
    const glowRing = new THREE.Mesh(new THREE.TorusGeometry(6.1, 0.045, 8, 120).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x2bc0c9 }));
    glowRing.position.y = 0.19;
    dial.add(glowRing);
    const track = new THREE.Mesh(new THREE.TorusGeometry(R_TILE, 0.03, 6, 140).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x3e6a86, transparent: true, opacity: 0.8 }));
    track.position.y = 0.05;
    dial.add(track);
    const under = softShadow(16, 16, 0.55, "2,8,14");
    under.position.y = -0.6;
    dial.add(under);

    // hour ticks and labels
    for (let h = 0; h < 24; h++) {
      const a = hourAngle(h * 60);
      const major = h % 6 === 0;
      const tick = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.04, major ? 0.55 : 0.3), new THREE.MeshBasicMaterial({ color: major ? 0xffffff : 0x6f93aa }));
      tick.position.set(Math.sin(a) * 5.65, 0.2, Math.cos(a) * 5.65);
      tick.rotation.y = a;
      dial.add(tick);
      if (HOUR_TEXT[h]) {
        const t = labelTexture(HOUR_TEXT[h], { bg: "rgba(12,26,41,0)", color: major ? "#ffffff" : "#9fb8c8", w: 200, h: 72, size: 38, weight: 600 });
        disposables.push(t);
        const lab = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.43).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false }));
        lab.position.set(Math.sin(a) * 5.0, 0.2, Math.cos(a) * 5.0);
        lab.rotation.y = a + Math.PI;
        dial.add(lab);
      }
    }

    // the whole day's volume, calls outside and chats inside
    const vmax = Math.max(...voice, ...chat, 1);
    const colG = new THREE.BoxGeometry(0.34, 1, 0.34);
    const vMat = new THREE.MeshLambertMaterial({ color: accent.clone().lerp(new THREE.Color(0x7fd6dd), 0.35), transparent: true, opacity: 0.85 });
    const cMat = new THREE.MeshLambertMaterial({ color: support.clone().lerp(new THREE.Color(0xb7c1ff), 0.25), transparent: true, opacity: 0.85 });
    const cols: { m: THREE.Mesh; h: number }[] = [];
    for (let h = 0; h < 24; h++) {
      const a = hourAngle(h * 60 + 30);
      for (const [arr, r, mat] of [
        [voice, 4.25, vMat],
        [chat, 3.55, cMat],
      ] as const) {
        const hh = 0.06 + (arr[h] / vmax) * 1.45;
        const m = new THREE.Mesh(colG, mat);
        m.position.set(Math.sin(a) * r, 0.18, Math.cos(a) * r);
        m.rotation.y = a;
        m.scale.y = 0.001;
        dial.add(m);
        cols.push({ m, h: hh });
      }
    }

    // centre label lying on the platform
    const centreT = labelTexture(dayLabel, { bg: "rgba(12,26,41,0)", color: "#ffffff", w: 512, h: 128, size: 76, weight: 700 });
    const subT = labelTexture("calls outside, chats inside", { bg: "rgba(12,26,41,0)", color: "#8fb3c6", w: 512, h: 64, size: 30, weight: 500 });
    disposables.push(centreT, subT);
    const centre = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.85).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: centreT, transparent: true, depthWrite: false }));
    centre.position.set(0, 0.2, 0.15);
    dial.add(centre);
    const sub = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 0.38).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: subT, transparent: true, depthWrite: false }));
    sub.position.set(0, 0.2, 0.85);
    dial.add(sub);

    // conversation tiles
    const COLORS: Record<TileCat, number> = { soft: 0x19a2ad, win: 0x19a2ad, other: 0x6d7ee6, quiet: 0x7d8f9d, fail: 0xe0607a };
    const tileG = new THREE.BoxGeometry(0.6, 0.34, 0.07);
    const edgeG = new THREE.BoxGeometry(0.6, 0.06, 0.08);
    const haloC = document.createElement("canvas");
    haloC.width = haloC.height = 128;
    const hg = haloC.getContext("2d")!;
    const rg = hg.createRadialGradient(64, 64, 4, 64, 64, 64);
    rg.addColorStop(0, "rgba(255,190,90,0.95)");
    rg.addColorStop(0.4, "rgba(241,166,58,0.4)");
    rg.addColorStop(1, "rgba(241,166,58,0)");
    hg.fillStyle = rg;
    hg.fillRect(0, 0, 128, 128);
    const haloT = new THREE.CanvasTexture(haloC);
    disposables.push(haloT);
    interface T3 {
      id: string;
      g: THREE.Group;
      mat: THREE.MeshLambertMaterial;
      halo?: THREE.Sprite;
      baseY: number;
      groups: DialFocus[];
      lift: number;
      hover: number;
      bump: number;
      cat: TileCat;
    }
    const tiles3: T3[] = [];
    const perHour = new Map<number, number>();
    const pickables: THREE.Object3D[] = [];
    [...tiles]
      .sort((a, b) => a.minute - b.minute)
      .forEach((tl) => {
        const hour = Math.floor(tl.minute / 60);
        const k = perHour.get(hour) ?? 0;
        perHour.set(hour, k + 1);
        const a = hourAngle(Math.floor(tl.minute / 60) * 60 + 30) + (k % 2 ? 0.05 : -0.05);
        const g = new THREE.Group();
        const mat = new THREE.MeshLambertMaterial({ color: COLORS[tl.cat], emissive: new THREE.Color(COLORS[tl.cat]).multiplyScalar(0.25), transparent: true });
        const box = new THREE.Mesh(tileG, mat);
        box.userData.id = tl.id;
        g.add(box);
        pickables.push(box);
        let halo: THREE.Sprite | undefined;
        if (tl.cat === "soft") {
          const edge = new THREE.Mesh(edgeG, new THREE.MeshBasicMaterial({ color: cue }));
          edge.position.y = 0.16;
          g.add(edge);
          halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloT, transparent: true, depthWrite: false, opacity: 0.55 }));
          halo.scale.set(1.6, 1.6, 1);
          halo.position.z = -0.06;
          g.add(halo);
        }
        const baseY = 0.3 + Math.floor(k / 2) * 0.42;
        g.position.set(Math.sin(a) * R_TILE, baseY, Math.cos(a) * R_TILE);
        g.rotation.y = a;
        dial.add(g);
        tiles3.push({ id: tl.id, g, mat, halo, baseY, groups: tl.groups, lift: 0, hover: 0, bump: 0, cat: tl.cat });
      });

    // people reaching out at different hours, as photos floating over the rim
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");
    const panes: THREE.Group[] = [];
    moments.forEach((mo, i) => {
      const a = hourAngle(mo.hour * 60);
      const g = new THREE.Group();
      const frame = new THREE.Mesh(new THREE.PlaneGeometry(2.36, 1.66), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      g.add(frame);
      const tex = loader.load(photo(mo.id, 480, 330));
      tex.colorSpace = THREE.SRGBColorSpace;
      disposables.push(tex);
      const pic = new THREE.Mesh(new THREE.PlaneGeometry(2.24, 1.54), new THREE.MeshBasicMaterial({ map: tex, color: 0xdddddd }));
      pic.position.z = 0.01;
      g.add(pic);
      const lt = labelTexture(mo.label, { bg: "#0c1a29", color: "#ffffff", w: 240, h: 72, size: 34, weight: 600 });
      disposables.push(lt);
      const lab = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.28), new THREE.MeshBasicMaterial({ map: lt, transparent: true }));
      lab.position.set(-0.6, -0.62, 0.02);
      g.add(lab);
      const spots = [
        [-5, 4, -5],
        [0.5, 4.6, -6.5],
        [5.5, 4.5, -6],
      ];
      const sp = spots[i % spots.length];
      g.position.set(sp[0], sp[1], sp[2]);
      g.userData.phase = i * 1.7;
      g.userData.y = sp[1];
      g.scale.setScalar(1.75);
      void a;
      scene.add(g);
      panes.push(g);
    });

    // camera framing: on wide screens the dial sits right of the headline, on phones below it
    let wide = true;
    const resize = (w: number, h: number) => {
      cam.aspect = w / h;
      wide = w >= 760;
      if (wide) {
        cam.position.set(0, 10.5, 21);
        cam.setViewOffset(w, h, -w * 0.22, h * 0.03, w, h);
      } else {
        cam.position.set(0, 15, 28);
        cam.clearViewOffset();
      }
      panes.forEach((p) => (p.visible = wide));
      cam.lookAt(0, 0.8, 0);
      cam.updateProjectionMatrix();
    };
    resize(st.size().w, st.size().h);
    st.onResize(resize);

    // pointer: lean the dial, hover and pick tiles
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2(9, 9);
    let tiltX = 0;
    let tiltY = 0;
    let hovered: T3 | null = null;
    const local = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top, w: r.width, h: r.height };
    };
    const onMove = (e: PointerEvent) => {
      const p = local(e);
      ndc.set((p.x / p.w) * 2 - 1, -(p.y / p.h) * 2 + 1);
      tiltX = ndc.y;
      tiltY = ndc.x;
    };
    const onLeave = () => {
      ndc.set(9, 9);
      tiltX = tiltY = 0;
    };
    const onClick = () => {
      if (hovered) cb.current.onPick(hovered.id);
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    el.addEventListener("click", onClick);

    let focus = currentFocus();
    const offFocus = onFocus((f) => (focus = f));
    const offPulse = onPulse(() => tiles3.forEach((t, i) => (t.bump = 1 + i * 0.02)));

    const tmp = new THREE.Vector3();
    let spin = 0.35;
    let lastTip = "";
    let grow = 0;
    st.loop((dt, t) => {
      grow = Math.min(1, grow + dt * 0.8);
      const ease = 1 - Math.pow(1 - grow, 3);
      cols.forEach((c) => {
        c.m.scale.y = Math.max(0.001, c.h * ease);
        c.m.position.y = 0.18 + (c.h * ease) / 2;
      });
      if (!reduce && !hovered) spin += dt * 0.045;
      dial.rotation.y = spin;
      dial.rotation.x = damp(dial.rotation.x, tiltX * 0.06, 3, dt);
      dial.rotation.z = damp(dial.rotation.z, -tiltY * 0.04, 3, dt);
      const scrollK = Math.min(1, window.scrollY / 600);
      cam.position.y = (wide ? 10.5 : 15) + (wide ? scrollK * 3 : 0);
      cam.lookAt(0, 0.8 - scrollK * 0.5, 0);

      // hover test
      ray.setFromCamera(ndc, cam);
      const hit = ndc.x < 2 ? ray.intersectObjects(pickables, false)[0] : undefined;
      const id = hit?.object.userData.id as string | undefined;
      hovered = id ? (tiles3.find((x) => x.id === id) ?? null) : null;
      el.style.cursor = hovered ? "pointer" : "default";

      for (const tl of tiles3) {
        const inFocus = focus !== "none" && tl.groups.includes(focus);
        const dim = focus !== "none" && !inFocus;
        tl.lift = damp(tl.lift, inFocus ? 0.75 : 0, 5, dt);
        tl.hover = damp(tl.hover, hovered === tl ? 1 : 0, 10, dt);
        tl.bump = Math.max(0, tl.bump - dt * 1.4);
        const b = tl.bump > 1 ? 0 : Math.sin(tl.bump * Math.PI) * 0.35;
        tl.g.position.y = tl.baseY + tl.lift + b + (inFocus && !reduce ? Math.sin(t * 2.4 + tl.baseY) * 0.06 : 0);
        const s = 1 + tl.hover * 0.3 + (inFocus ? 0.12 : 0);
        tl.g.scale.setScalar(s);
        tl.mat.opacity = damp(tl.mat.opacity, dim ? 0.22 : 1, 6, dt);
        if (tl.halo) {
          const m = tl.halo.material as THREE.SpriteMaterial;
          m.opacity = dim ? 0.1 : (inFocus ? 0.95 : 0.45) + (reduce ? 0 : Math.sin(t * 2 + tl.baseY * 3) * 0.12);
          tl.halo.scale.setScalar(inFocus ? 2.3 : 1.6);
        }
      }
      for (const p of panes) {
        p.lookAt(cam.position);
        p.position.y = p.userData.y + (reduce ? 0 : Math.sin(t * 0.8 + p.userData.phase) * 0.12);
      }

      // tooltip position for the hovered tile
      if (hovered) {
        hovered.g.getWorldPosition(tmp);
        tmp.y += 0.35;
        tmp.project(cam);
        const { w, h } = st.size();
        const host = el.closest(".hero") as HTMLElement | null;
        const er = el.getBoundingClientRect();
        const hr = host?.getBoundingClientRect() ?? er;
        const x = (tmp.x * 0.5 + 0.5) * w + (er.left - hr.left);
        const y = (-tmp.y * 0.5 + 0.5) * h + (er.top - hr.top);
        const k = `${hovered.id}:${Math.round(x / 4)}:${Math.round(y / 4)}`;
        if (k !== lastTip) {
          lastTip = k;
          cb.current.onHover({ id: hovered.id, x, y });
        }
      } else if (lastTip) {
        lastTip = "";
        cb.current.onHover(null);
      }
      st.renderer.render(scene, cam);
    });

    return () => {
      offFocus();
      offPulse();
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      el.removeEventListener("click", onClick);
      disposables.forEach((d) => d.dispose());
      st.dispose();
    };
    // the scene is built once per data set
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tiles, voice, chat, moments, dayLabel]);

  return <div ref={ref} style={{ position: "absolute", inset: 0 }} />;
}
