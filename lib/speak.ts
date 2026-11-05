// Browser side: gets one line's audio from a voice chain, falling back to the
// next voice automatically when one is down.
import type { ChainStep } from "./options";
import type { LineAudio } from "./player";
import { kokoroSpeak } from "./kokoro";

/** The listener's connection dropped (not the voice's fault). */
export class NetworkError extends Error {
  readonly kind = "network";
}
/** Every voice in the chain is down or resting. */
export class OfflineError extends Error {
  readonly kind = "offline";
}
/** One voice is down or resting; the chain should move on. */
class EngineDown extends Error {}

function base64ToUrl(b64: string, mime: string) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return URL.createObjectURL(new Blob([bytes], { type: mime }));
}

async function serverLine(step: ChainStep, text: string): Promise<LineAudio> {
  let res: Response;
  try {
    res = await fetch("/api/speak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voice: step.voice, engine: step.engine }),
    });
  } catch {
    throw new NetworkError("Couldn't reach Talk");
  }
  if (res.status === 502 || res.status === 503) throw new EngineDown(step.engine);
  if (!res.ok) throw new NetworkError(`speak ${res.status}`);
  const data = (await res.json()) as { audio: string; mime: string; words?: LineAudio["words"] };
  return { url: base64ToUrl(data.audio, data.mime), words: data.words ?? null };
}

async function lineFrom(step: ChainStep, text: string): Promise<LineAudio> {
  if (step.engine === "kokoro") {
    try {
      return await kokoroSpeak(text, step.voice);
    } catch {
      if (typeof navigator !== "undefined" && !navigator.onLine) throw new NetworkError("offline");
      throw new EngineDown("kokoro");
    }
  }
  return serverLine(step, text);
}

/**
 * Tries the chain in order. Once a voice fails, the rest of the read sticks
 * with the next one, so the listener doesn't bounce between voices.
 */
export class VoiceChain {
  private index = 0;
  private listeners = new Set<() => void>();

  constructor(private steps: ChainStep[]) {}

  /** Which voice is reading now (0 = the main voice). */
  get current() {
    return this.index;
  }
  get step(): ChainStep | null {
    return this.steps[this.index] ?? null;
  }

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };

  async speak(text: string): Promise<LineAudio> {
    for (;;) {
      const at = this.index;
      const step = this.steps[at];
      if (!step) throw new OfflineError("No voice available");
      try {
        return await lineFrom(step, text);
      } catch (err) {
        if (!(err instanceof EngineDown)) throw err;
        if (this.index === at) {
          this.index = at + 1;
          this.listeners.forEach((f) => f());
        }
      }
    }
  }
}
