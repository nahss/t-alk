// Microsoft Edge voices, via node-edge-tts. Server only.
import { EdgeTTS } from "node-edge-tts";
import type { WordTiming } from "../align";

export type EdgeResult = { audio: Buffer; words: WordTiming[] };

export async function edgeSpeak(text: string, voice: string): Promise<EdgeResult> {
  const lang = voice.split("-").slice(0, 2).join("-");
  const tts = new EdgeTTS({
    voice,
    lang,
    outputFormat: "audio-24khz-48kbitrate-mono-mp3",
    saveSubtitles: true,
    timeout: 20000,
  });

  const chunks: Buffer[] = [];
  const words: WordTiming[] = [];
  for await (const chunk of tts.streamAudio(text)) {
    if (Buffer.isBuffer(chunk)) chunks.push(chunk);
    else words.push({ text: chunk.part.trim(), start: chunk.start, end: chunk.end });
  }
  if (chunks.length === 0) throw new Error("Edge sent no audio");
  return { audio: Buffer.concat(chunks), words };
}
