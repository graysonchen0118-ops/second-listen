// How a day's conversations spread over the 24 hours, Eastern. Calls follow the working day,
// chats climb after dinner and run late.
const VOICE_W = [0.3, 0.2, 0.15, 0.1, 0.12, 0.25, 0.7, 1.6, 3.2, 4.4, 4.8, 4.6, 4.9, 5.0, 4.7, 4.4, 4.5, 4.8, 4.6, 3.8, 2.9, 1.9, 1.1, 0.6];
const CHAT_W = [1.3, 0.8, 0.5, 0.3, 0.3, 0.4, 0.9, 1.6, 2.2, 2.4, 2.5, 2.7, 3.2, 3.3, 2.8, 2.6, 2.7, 3.0, 3.6, 4.4, 5.2, 5.8, 5.6, 3.4];

function spread(total: number, w: number[]) {
  const sum = w.reduce((a, b) => a + b, 0);
  return w.map((x) => Math.round((x / sum) * total));
}

export const hourly = (voiceTotal: number, chatTotal: number) => ({ voice: spread(voiceTotal, VOICE_W), chat: spread(chatTotal, CHAT_W) });

export function windowShare(v: number[], c: number[], from: number, to: number) {
  const all = v.reduce((a, b) => a + b, 0) + c.reduce((a, b) => a + b, 0);
  let vv = 0;
  let cc = 0;
  for (let h = from; h < to; h++) {
    vv += v[h];
    cc += c[h];
  }
  return { total: vv + cc, share: Math.round(((vv + cc) / all) * 100), chatShare: vv + cc ? Math.round((cc / (vv + cc)) * 100) : 0 };
}
