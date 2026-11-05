// Text helpers: word count and splitting text into lines (sentences) to read.

export const WORD_LIMIT = 20000;

export function countWords(text: string): number {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}

/** Longest line we send for speech in one go. Longer sentences are broken at a pause. */
const MAX_LINE = 280;

function splitLong(sentence: string): string[] {
  if (sentence.length <= MAX_LINE) return [sentence];
  // Prefer a natural pause (; : , — –) closest to the middle.
  const mid = sentence.length / 2;
  let best = -1;
  const re = /[;:,—–]\s+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(sentence))) {
    const cut = m.index + 1;
    if (cut > 40 && sentence.length - cut > 40 && (best < 0 || Math.abs(cut - mid) < Math.abs(best - mid))) best = cut;
  }
  if (best < 0) {
    // No pause: break at the space nearest the middle.
    const before = sentence.lastIndexOf(" ", mid);
    const after = sentence.indexOf(" ", mid);
    best = before > 0 && (after < 0 || mid - before <= after - mid) ? before : after;
    if (best <= 0) return [sentence];
  }
  return [...splitLong(sentence.slice(0, best).trim()), ...splitLong(sentence.slice(best).trim())];
}

/** Splits text into lines to read: one sentence per line, paragraphs kept apart. */
export function splitLines(text: string): string[] {
  const segmenter =
    typeof Intl !== "undefined" && "Segmenter" in Intl ? new Intl.Segmenter(undefined, { granularity: "sentence" }) : null;
  // Keep line breaks that look intended (headings, lists, poems), but join
  // hard-wrapped lines that carry on mid-sentence.
  const chunks: string[] = [];
  for (const raw of text.replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.trim();
    if (!line) {
      chunks.push("");
      continue;
    }
    const prev = chunks[chunks.length - 1];
    if (prev && !/[.!?…:;"”’)\]]$/.test(prev) && /^[\p{Ll}]/u.test(line)) chunks[chunks.length - 1] = `${prev} ${line}`;
    else chunks.push(line);
  }
  const lines: string[] = [];
  for (const para of chunks) {
    const p = para.replace(/\s+/g, " ").trim();
    if (!p) continue;
    const sentences = segmenter
      ? Array.from(segmenter.segment(p), (s) => s.segment.trim())
      : p.split(/(?<=[.!?…])\s+(?=[^a-z])/);
    for (const s of sentences) if (s) lines.push(...splitLong(s));
  }
  return lines;
}
