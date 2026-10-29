/** small seeded generator, so the server render and the browser build the same records */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type R = () => number;
export const int = (r: R, lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));
export const pick = <T,>(r: R, a: readonly T[]): T => a[Math.floor(r() * a.length)];
export const chance = (r: R, p: number) => r() < p;
