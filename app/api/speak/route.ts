// Makes the audio for one line: a Microsoft Edge voice (with word timings)
// or YarnGPT. Public route used by the reader. Phase 6 adds the hourly limit.
import { edgeSpeak } from "@/lib/tts/edge";
import { yarnSpeak, YarnError } from "@/lib/tts/yarngpt";
import { SPEAK_VOICES } from "@/lib/options";
import { fromOurSite, json, simulatedDown } from "@/lib/server/request";

const MAX_CHARS = 600;

export async function POST(request: Request) {
  if (!fromOurSite(request)) return json({ error: "Not allowed" }, 403);

  const body = await request.json().catch(() => null);
  const { text, voice, engine = "edge" } = body ?? {};
  if (typeof text !== "string" || !text.trim() || text.length > MAX_CHARS) {
    return json({ error: "Send one line of text." }, 400);
  }
  if ((engine !== "edge" && engine !== "yarngpt") || typeof voice !== "string" || !SPEAK_VOICES[engine as "edge" | "yarngpt"].has(voice)) {
    return json({ error: "Unknown voice." }, 400);
  }
  if (simulatedDown(engine)) return json({ error: "voice_unavailable" }, 502);

  try {
    if (engine === "edge") {
      const { audio, words } = await edgeSpeak(text, voice);
      return json({ audio: audio.toString("base64"), mime: "audio/mpeg", words });
    }
    const audio = await yarnSpeak(text, voice);
    return json({ audio: audio.toString("base64"), mime: "audio/mpeg", words: null });
  } catch (err) {
    // Out of credits or over the daily limit: this voice is resting, not broken.
    if (err instanceof YarnError && (err.code === "OUT_OF_CREDITS" || err.code === "RATE_LIMITED")) {
      return json({ error: "voice_resting" }, 503);
    }
    return json({ error: "voice_unavailable" }, 502);
  }
}
