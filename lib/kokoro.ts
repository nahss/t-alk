// Kokoro: the backup voice that runs inside the listener's browser, in a
// background thread (see kokoro.worker.ts) so the page stays responsive.
// The model (~92 MB) downloads only when it's actually needed, then the browser keeps it.
import type { LineAudio } from "./player";

type Reply = { id: number; ok: boolean; blob?: Blob; error?: string } | { type: "progress"; progress: number };

let worker: Worker | null = null;
let nextId = 1;
const waiting = new Map<number, { resolve: (b: Blob | null) => void; reject: (e: Error) => void }>();
const progressListeners = new Set<(percent: number) => void>();

function getWorker() {
  if (!worker) {
    worker = new Worker(new URL("./kokoro.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (e: MessageEvent<Reply>) => {
      const msg = e.data;
      if ("type" in msg) {
        progressListeners.forEach((f) => f(msg.progress));
        return;
      }
      const w = waiting.get(msg.id);
      if (!w) return;
      waiting.delete(msg.id);
      if (msg.ok) w.resolve(msg.blob ?? null);
      else w.reject(new Error(msg.error ?? "Kokoro failed"));
    };
    worker.onerror = () => {
      for (const w of waiting.values()) w.reject(new Error("Kokoro stopped"));
      waiting.clear();
      worker?.terminate();
      worker = null;
    };
  }
  return worker;
}

function ask(message: Record<string, unknown>): Promise<Blob | null> {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    waiting.set(id, { resolve, reject });
    getWorker().postMessage({ id, ...message });
  });
}

/** Starts the download and set-up. Calls onProgress with 0–100 while the model downloads. */
export async function loadKokoro(onProgress?: (percent: number) => void) {
  if (onProgress) progressListeners.add(onProgress);
  try {
    await ask({ type: "load" });
  } finally {
    if (onProgress) progressListeners.delete(onProgress);
  }
}

/** Makes one line of audio (no word timings: Kokoro lines light up whole). */
export async function kokoroSpeak(text: string, voice: string): Promise<LineAudio> {
  const blob = await ask({ type: "speak", text, voice });
  if (!blob) throw new Error("Kokoro sent no audio");
  return { url: URL.createObjectURL(blob), words: null };
}
