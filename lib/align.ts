// Matches word timings from a voice engine to the words of the line on screen,
// so the right word lights up even when the engine splits words differently.

export type WordTiming = { text: string; start: number; end: number };

const norm = (s: string) => (s.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []).join("");

/** For each timing, the index of the on-screen token it belongs to (or -1). */
export function alignTimings(tokens: string[], timings: WordTiming[]): number[] {
  const tokenNorms = tokens.map(norm);
  const out: number[] = [];
  let p = 0;
  for (const t of timings) {
    const w = norm(t.text);
    let hit = -1;
    if (w) {
      for (let i = p; i < Math.min(tokens.length, p + 4); i++) {
        const tn = tokenNorms[i];
        if (tn && (tn.includes(w) || w.includes(tn))) {
          hit = i;
          break;
        }
      }
    }
    out.push(hit);
    if (hit >= 0) p = tokenNorms[hit] === w || !tokenNorms[hit].startsWith(w) ? hit + 1 : hit;
  }
  return out;
}

/** Index of the token being spoken at `ms`, or -1 before the first word. */
export function tokenAt(ms: number, timings: WordTiming[], map: number[]): number {
  let idx = -1;
  for (let i = 0; i < timings.length; i++) {
    if (timings[i].start <= ms && map[i] >= 0) idx = map[i];
    if (timings[i].start > ms) break;
  }
  return idx;
}
