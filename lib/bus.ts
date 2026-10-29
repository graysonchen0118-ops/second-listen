// A tiny event line between the HTML and the 3D layers.
export type Tone = "ok" | "err" | "warn" | "info";
export interface Pulse {
  tone: Tone;
  kind: "verdict" | "run" | "ruling" | "filter" | "alert";
}
type Fn = (p: Pulse) => void;
const subs = new Set<Fn>();
export const pulse = (p: Pulse) => subs.forEach((f) => f(p));
export const onPulse = (f: Fn) => {
  subs.add(f);
  return () => {
    subs.delete(f);
  };
};

/** which group of tiles the day dial lifts */
export type DialFocus = "none" | "wins-cues" | "silent" | "mismatch" | "flagged" | "compliance";
type FocusFn = (f: DialFocus) => void;
const focusSubs = new Set<FocusFn>();
let focus: DialFocus = "none";
export const currentFocus = () => focus;
export const setFocus = (f: DialFocus) => {
  focus = f;
  focusSubs.forEach((fn) => fn(f));
};
export const onFocus = (f: FocusFn) => {
  focusSubs.add(f);
  return () => {
    focusSubs.delete(f);
  };
};
