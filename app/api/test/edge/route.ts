// Phase 1 test page only. Protected by the password check in proxy.ts.
import { edgeSpeak } from "@/lib/tts/edge";
import { EDGE_VOICE_IDS } from "@/lib/voices";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const text = body?.text;
  const voice = body?.voice;
  if (typeof text !== "string" || !text.trim() || text.length > 600) {
    return Response.json({ error: "Send one line of text (up to 600 characters)." }, { status: 400 });
  }
  if (typeof voice !== "string" || !EDGE_VOICE_IDS.has(voice)) {
    return Response.json({ error: "Unknown Edge voice." }, { status: 400 });
  }

  const started = Date.now();
  try {
    const { audio, words } = await edgeSpeak(text, voice);
    return Response.json({
      audio: audio.toString("base64"),
      mime: "audio/mpeg",
      words,
      ms: Date.now() - started,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json(
      { error: `The Edge voice didn't answer (${message.slice(0, 200)})`, ms: Date.now() - started },
      { status: 502 },
    );
  }
}
