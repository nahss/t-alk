// Makes the audio for one line with a Microsoft Edge voice, plus word timings.
// Public route used by the reader. Phase 6 adds the hourly limit.
import { edgeSpeak } from "@/lib/tts/edge";
import { SPEAK_VOICES } from "@/lib/options";

const MAX_CHARS = 600;

/** Only accept requests from Talk's own pages (stops other sites using it). */
function fromOurSite(request: Request) {
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin") return false;
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      return new URL(origin).host === new URL(request.url).host;
    } catch {
      return false;
    }
  }
  return true;
}

export async function POST(request: Request) {
  if (!fromOurSite(request)) return Response.json({ error: "Not allowed" }, { status: 403 });

  const body = await request.json().catch(() => null);
  const text = body?.text;
  const voice = body?.voice;
  if (typeof text !== "string" || !text.trim() || text.length > MAX_CHARS) {
    return Response.json({ error: "Send one line of text." }, { status: 400 });
  }
  if (typeof voice !== "string" || !SPEAK_VOICES.has(voice)) {
    return Response.json({ error: "Unknown voice." }, { status: 400 });
  }

  try {
    const { audio, words } = await edgeSpeak(text, voice);
    return Response.json(
      { audio: audio.toString("base64"), mime: "audio/mpeg", words },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json({ error: "voice_unavailable" }, { status: 502 });
  }
}
