// Browser side of languages: detecting what a text is in, and translating it
// a batch at a time just ahead of the listener (never the whole text up front).

export type Detected = { code: string; name: string };

/** Google's free daily allowance for translation is used up. */
export class TranslationResting extends Error {
  readonly kind = "translation";
}
/** Google is busy for a moment; trying again in a few minutes should work. */
export class TranslationBusy extends Error {
  readonly kind = "busy";
}
/** Translation isn't offered in the visitor's country. */
export class TranslationBlocked extends Error {
  readonly kind = "region";
}
class TranslationNetwork extends Error {
  readonly kind = "network";
}

async function post(path: string, body: unknown) {
  let res: Response;
  try {
    res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  } catch {
    throw new TranslationNetwork("Couldn't reach Talk");
  }
  if (res.status === 503) {
    const data = await res.json().catch(() => null);
    if (data?.error === "translation_busy") throw new TranslationBusy("busy");
    throw new TranslationResting("resting");
  }
  if (res.status === 403) {
    const data = await res.json().catch(() => null);
    if (data?.error === "region") throw new TranslationBlocked("region");
  }
  if (!res.ok) throw new TranslationNetwork(`${path} ${res.status}`);
  return res.json();
}

/* ---------- detection ---------- */

const SAMPLE = 2000;
const detections = new Map<string, Promise<Detected>>();

/** The sample of a text that detection looks at (and the key results are cached by). */
export const detectionKey = (text: string) => text.trim().slice(0, SAMPLE);

export function detectLanguage(text: string): Promise<Detected> {
  const key = detectionKey(text);
  let p = detections.get(key);
  if (!p) {
    p = post("/api/detect", { text: key }) as Promise<Detected>;
    detections.set(key, p);
    p.catch(() => detections.delete(key));
  }
  return p;
}

/* ---------- translation ---------- */

const FIRST_BATCH = 12;
const BATCH = 40;
/** Start the next batch when the listener is this many lines from the end of what's translated. */
const AHEAD = 8;

export class Translation {
  readonly translated: (string | null)[];
  private batches = new Map<number, Promise<void>>();
  private listeners = new Set<() => void>();
  version = 0;

  constructor(
    readonly original: string[],
    private optionId: string,
  ) {
    this.translated = original.map(() => null);
  }

  /** Lines covered by the first batch, for "Translating · Lines 1–12". */
  get firstBatchSize() {
    return Math.min(FIRST_BATCH, this.original.length);
  }

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };
  getVersion = () => this.version;

  /** The translated text of line i, translating its batch first if needed. */
  async line(i: number): Promise<string> {
    const have = this.translated[i];
    if (have != null) return have;
    await this.batch(this.batchStart(i));
    return this.translated[i] ?? this.original[i];
  }

  /** Start translating the next batch early, so reading never waits for it. */
  prefetch(i: number) {
    const next = i + AHEAD;
    if (next < this.original.length && this.translated[next] == null) {
      this.batch(this.batchStart(next)).catch(() => undefined);
    }
  }

  private batchStart(i: number) {
    if (i < FIRST_BATCH) return 0;
    return FIRST_BATCH + Math.floor((i - FIRST_BATCH) / BATCH) * BATCH;
  }

  private batch(start: number): Promise<void> {
    let p = this.batches.get(start);
    if (!p) {
      const end = Math.min(this.original.length, start === 0 ? FIRST_BATCH : start + BATCH);
      p = post("/api/translate", { lines: this.original.slice(start, end), target: this.optionId }).then(
        (data: { lines: string[] }) => {
          data.lines.forEach((t, k) => {
            this.translated[start + k] = t;
          });
          this.version++;
          this.listeners.forEach((f) => f());
        },
      );
      this.batches.set(start, p);
      p.catch(() => this.batches.delete(start));
    }
    return p;
  }
}
