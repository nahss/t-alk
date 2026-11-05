// Runs Kokoro in a background thread so the page never freezes while it works.
/// <reference lib="webworker" />
import { KokoroTTS } from "kokoro-js";

const MODEL = "onnx-community/Kokoro-82M-v1.0-ONNX";

type Request = { id: number; type: "load" } | { id: number; type: "speak"; text: string; voice: string };

let model: Promise<KokoroTTS> | null = null;
let queue: Promise<unknown> = Promise.resolve();

function load() {
  if (!model) {
    model = KokoroTTS.from_pretrained(MODEL, {
      dtype: "q8",
      device: "wasm",
      progress_callback: (p) => {
        if (p.status === "progress" && p.file.endsWith(".onnx")) {
          self.postMessage({ type: "progress", progress: p.progress });
        }
      },
    });
    model.catch(() => {
      model = null;
    });
  }
  return model;
}

self.onmessage = (e: MessageEvent<Request>) => {
  const msg = e.data;
  // One job at a time: the model can't make two lines at once.
  const job = queue.then(async () => {
    try {
      const tts = await load();
      if (msg.type === "load") {
        self.postMessage({ id: msg.id, ok: true });
        return;
      }
      const audio = await tts.generate(msg.text, { voice: msg.voice as never });
      self.postMessage({ id: msg.id, ok: true, blob: audio.toBlob() });
    } catch (err) {
      self.postMessage({ id: msg.id, ok: false, error: err instanceof Error ? err.message : String(err) });
    }
  });
  queue = job.catch(() => undefined);
};
