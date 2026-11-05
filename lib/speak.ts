// Browser side: asks the server for one line's audio and turns it into a playable link.
import type { LineAudio } from "./player";

export async function speakLine(text: string, voice: string): Promise<LineAudio> {
  const res = await fetch("/api/speak", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, voice }),
  });
  if (!res.ok) throw new Error(`speak ${res.status}`);
  const data = (await res.json()) as { audio: string; mime: string; words?: LineAudio["words"] };
  const bin = atob(data.audio);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return { url: URL.createObjectURL(new Blob([bytes], { type: data.mime })), words: data.words ?? null };
}
