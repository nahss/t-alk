// YarnGPT voices. Server only: uses YARNGPT_API_KEY, which must never reach the browser.
// Uses the "prepare + stream" route, which starts sending audio as soon as it's made.

const BASE = "https://api.yarngpt.ai";

export class YarnError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

async function toYarnError(res: Response): Promise<YarnError> {
  let code = `HTTP_${res.status}`;
  let message = res.statusText || "YarnGPT request failed";
  try {
    const body = await res.json();
    const err = body?.error ?? body;
    if (typeof err?.code === "string") code = err.code;
    if (typeof err?.message === "string") message = err.message;
    else if (typeof err?.user_message === "string") message = err.user_message;
  } catch {
    // body wasn't JSON; keep the defaults
  }
  if (res.status === 402) code = "OUT_OF_CREDITS";
  if (res.status === 429) code = "RATE_LIMITED";
  return new YarnError(res.status, code, message.slice(0, 300));
}

export async function yarnSpeak(text: string, voice: string): Promise<Buffer> {
  const key = process.env.YARNGPT_API_KEY;
  if (!key) throw new YarnError(500, "NO_KEY", "YARNGPT_API_KEY is not set on the server");

  const prep = await fetch(`${BASE}/api/v1/tts/prepare`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ text, voice, output_format: "mp3" }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!prep.ok) throw await toYarnError(prep);
  const { stream_url } = (await prep.json()) as { stream_url?: string };
  if (!stream_url) throw new YarnError(502, "NO_STREAM", "YarnGPT didn't return a stream link");

  // The ticket in stream_url is the credential, so the API key isn't sent here.
  const audioRes = await fetch(new URL(stream_url, BASE), { signal: AbortSignal.timeout(60_000) });
  if (!audioRes.ok) throw await toYarnError(audioRes);
  const audio = Buffer.from(await audioRes.arrayBuffer());
  if (audio.length === 0) throw new YarnError(502, "EMPTY", "YarnGPT sent no audio");
  return audio;
}
