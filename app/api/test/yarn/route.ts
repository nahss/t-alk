// Phase 1 test page only. Protected by the password check in proxy.ts.
import { yarnSpeak, YarnError } from "@/lib/tts/yarngpt";
import { YARN_VOICE_IDS } from "@/lib/voices";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const text = body?.text;
  const voice = body?.voice;
  if (typeof text !== "string" || !text.trim() || text.length > 600) {
    return Response.json({ error: "Send one line of text (up to 600 characters)." }, { status: 400 });
  }
  if (typeof voice !== "string" || !YARN_VOICE_IDS.has(voice)) {
    return Response.json({ error: "Unknown YarnGPT voice." }, { status: 400 });
  }

  const started = Date.now();
  try {
    const audio = await yarnSpeak(text, voice);
    return Response.json({ audio: audio.toString("base64"), mime: "audio/mpeg", ms: Date.now() - started });
  } catch (err) {
    const code = err instanceof YarnError ? err.code : "ERROR";
    const status = err instanceof YarnError && err.status >= 400 && err.status < 600 ? err.status : 502;
    const message = err instanceof Error ? err.message : String(err);
    return Response.json(
      { error: `YarnGPT didn't answer: ${code} (${message.slice(0, 200)})`, code, ms: Date.now() - started },
      { status },
    );
  }
}
