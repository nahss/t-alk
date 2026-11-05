"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { kokoroSpeak, loadKokoro } from "@/lib/kokoro";
import { SAMPLE } from "@/lib/sample";
import { TEST_OPTIONS, type EngineId, type TestOption } from "@/lib/voices";
import { alignTimings, tokenAt, type WordTiming } from "@/lib/align";
import styles from "./test.module.css";

type Clip = { url: string; words: WordTiming[] | null; ms: number };
type Active = { rowKey: string; line: number; token: number; waiting: boolean; hasWords: boolean };
type Stat = { text: string; tone: "ok" | "error" };

const SPEEDS = [0.75, 1, 1.25, 1.5];
// How many lines to prepare ahead of the one playing.
const LOOKAHEAD: Record<EngineId, number> = { edge: 2, yarngpt: 1, kokoro: 1 };
const SILENCE = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";

/* ---------- making audio ---------- */

const clipCache = new Map<string, Promise<Clip>>();

function base64ToUrl(b64: string, mime: string) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return URL.createObjectURL(new Blob([bytes], { type: mime }));
}

async function serverClip(path: string, text: string, voice: string): Promise<Clip> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, voice }),
  });
  const data = await res.json().catch(() => ({ error: `Server error ${res.status}` }));
  if (!res.ok || !data.audio) throw new Error(data.error ?? `Server error ${res.status}`);
  return { url: base64ToUrl(data.audio, data.mime), words: data.words ?? null, ms: data.ms };
}

// Kokoro runs in this browser, in a background thread (lib/kokoro.ts).
const kokoroListeners = new Set<(msg: string) => void>();
const kokoroSay = (msg: string) => kokoroListeners.forEach((f) => f(msg));
let kokoroReady = false;

async function kokoroClip(text: string, voice: string): Promise<Clip> {
  if (!kokoroReady) {
    kokoroSay("Downloading the backup voice…");
    try {
      await loadKokoro((p) => kokoroSay(`Downloading the backup voice… ${Math.round(p)}%`));
    } catch (err) {
      kokoroSay(`Backup voice failed to load: ${err instanceof Error ? err.message : err}`);
      throw err;
    }
    kokoroReady = true;
    kokoroSay("Backup voice loaded in this browser.");
  }
  const t0 = performance.now();
  const audio = await kokoroSpeak(text, voice);
  return { url: audio.url, words: null, ms: Math.round(performance.now() - t0) };
}

function getClip(engine: EngineId, voice: string, text: string): Promise<Clip> {
  const key = `${engine}|${voice}|${text}`;
  let clip = clipCache.get(key);
  if (!clip) {
    clip =
      engine === "edge"
        ? serverClip("/api/test/edge", text, voice)
        : engine === "yarngpt"
          ? serverClip("/api/test/yarn", text, voice)
          : kokoroClip(text, voice);
    clipCache.set(key, clip);
    clip.catch(() => clipCache.delete(key));
  }
  return clip;
}

// Play a silent sound while still inside the click, so phones (iPhone especially)
// allow this audio element to play later lines without another tap.
function unlockAudio(audio: HTMLAudioElement) {
  audio.src = SILENCE;
  audio.play().catch(() => undefined);
}

const average = (xs: number[]) => Math.round(xs.reduce((a, b) => a + b, 0) / xs.length);

function lineWithWords(line: string, current: number): ReactNode {
  let w = -1;
  return line.split(/(\s+)/).map((part, i) => {
    if (/^\s+$/.test(part) || part === "") return part;
    w++;
    const state = w < current ? "said" : w === current ? "now" : "next";
    return (
      <span key={i} className={styles.word} data-state={state}>
        {part}
      </span>
    );
  });
}

/* ---------- the page ---------- */

export default function TestBoard() {
  const [speed, setSpeed] = useState(1);
  const [voices, setVoices] = useState<Record<string, string>>({});
  const [active, setActive] = useState<Active | null>(null);
  const [stats, setStats] = useState<Record<string, Stat>>({});
  const [kokoroMsg, setKokoroMsg] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const runRef = useRef(0);
  const speedRef = useRef(1);
  const finishRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    kokoroListeners.add(setKokoroMsg);
    return () => {
      kokoroListeners.delete(setKokoroMsg);
    };
  }, []);

  useEffect(() => {
    speedRef.current = speed;
    if (audioRef.current) audioRef.current.playbackRate = speed;
  }, [speed]);

  const halt = useCallback(() => {
    runRef.current++;
    finishRef.current?.();
    audioRef.current?.pause();
  }, []);

  useEffect(() => halt, [halt]);

  const stop = useCallback(() => {
    halt();
    setActive(null);
  }, [halt]);

  const playClip = useCallback((audio: HTMLAudioElement, clip: Clip, onTime: (ms: number) => void) => {
    return new Promise<boolean>((resolve) => {
      let raf = 0;
      let settled = false;
      const done = (ok: boolean) => {
        if (settled) return;
        settled = true;
        cancelAnimationFrame(raf);
        audio.onended = null;
        audio.onerror = null;
        finishRef.current = null;
        resolve(ok);
      };
      const tick = () => {
        onTime(audio.currentTime * 1000);
        raf = requestAnimationFrame(tick);
      };
      finishRef.current = () => done(true);
      audio.onended = () => done(true);
      audio.onerror = () => done(false);
      audio.src = clip.url;
      audio.playbackRate = speedRef.current;
      audio
        .play()
        .then(() => {
          if (!settled) raf = requestAnimationFrame(tick);
        })
        .catch(() => done(false));
    });
  }, []);

  const play = useCallback(
    async (option: TestOption, engineIndex: number, startLine = 0) => {
      const engine = option.engines[engineIndex];
      const rowKey = `${option.id}:${engineIndex}`;
      const voice = voices[rowKey] ?? engine.voices[0].id;
      const lines = SAMPLE[option.sample].lines;

      halt();
      const run = runRef.current;
      const audio = audioRef.current ?? (audioRef.current = new Audio());
      unlockAudio(audio);

      const setStat = (text: string, tone: Stat["tone"] = "ok") =>
        setStats((s) => ({ ...s, [rowKey]: { text, tone } }));
      let firstWait: number | null = null;
      const made: number[] = [];
      let gotWords = false;

      for (let i = startLine; i < lines.length; i++) {
        if (run !== runRef.current) return;
        setActive({ rowKey, line: i, token: -1, waiting: true, hasWords: false });

        const waitStart = performance.now();
        const current = getClip(engine.engine, voice, lines[i]);
        for (let k = i + 1; k <= Math.min(lines.length - 1, i + LOOKAHEAD[engine.engine]); k++) {
          getClip(engine.engine, voice, lines[k]).catch(() => undefined);
        }

        let clip: Clip;
        try {
          clip = await current;
        } catch (err) {
          if (run === runRef.current) {
            setStat(err instanceof Error ? err.message : String(err), "error");
            setActive(null);
          }
          return;
        }
        if (run !== runRef.current) return;

        const waited = Math.round(performance.now() - waitStart);
        if (firstWait === null) firstWait = waited;
        made.push(clip.ms);
        if (clip.words?.length) gotWords = true;
        setStat(
          `Line ${i + 1} of ${lines.length} · first sound after ${firstWait} ms · ` +
            `each line takes about ${average(made)} ms to make · word timings: ${gotWords ? "yes" : "no"}`,
        );
        const words = clip.words?.length ? clip.words : null;
        setActive({ rowKey, line: i, token: -1, waiting: false, hasWords: !!words });

        const map = words ? alignTimings(lines[i].split(/\s+/), words) : [];
        const ok = await playClip(audio, clip, (ms) => {
          if (!words) return;
          const token = tokenAt(ms, words, map);
          setActive((a) => (a && a.token !== token ? { ...a, token } : a));
        });
        if (run !== runRef.current) return;
        if (!ok) {
          setStat("This browser couldn't play the audio.", "error");
          setActive(null);
          return;
        }
      }
      if (run === runRef.current) setActive(null);
    },
    [voices, halt, playClip],
  );

  return (
    <main className={styles.page}>
      <header className={styles.head}>
        <p className={styles.eyebrow}>Talk · private</p>
        <h1>Voice test</h1>
        <p>
          The same short paragraph, through every voice option and engine. Lines are made one at a time, a
          couple ahead of the one playing, the same way the real reader will work. Tap a line while it plays
          to jump to it.
        </p>
        <div className={styles.controls}>
          <span>Speed</span>
          <div role="group" aria-label="Speed" className={styles.speeds}>
            {SPEEDS.map((v) => (
              <button key={v} aria-pressed={speed === v} onClick={() => setSpeed(v)}>
                {v}×
              </button>
            ))}
          </div>
          {kokoroMsg && <span className={styles.kokoro}>{kokoroMsg}</span>}
        </div>
      </header>

      {TEST_OPTIONS.map((option) => (
        <section key={option.id} className={styles.option} aria-labelledby={`h-${option.id}`}>
          <div className={styles.optionHead}>
            <h2 id={`h-${option.id}`}>{option.name}</h2>
            <span className={styles.kind} data-kind={option.kind}>
              {option.kind === "language" ? "Language · translated, then read" : "Accent · your words, as written"}
            </span>
          </div>
          <p className={styles.reading}>
            Reading: {SAMPLE[option.sample].label}
            {option.note ? `. ${option.note}` : ""}
          </p>

          {option.engines.map((engine, idx) => {
            const rowKey = `${option.id}:${idx}`;
            const isActive = active?.rowKey === rowKey;
            const stat = stats[rowKey];
            const lines = SAMPLE[option.sample].lines;
            return (
              <div key={rowKey} className={styles.row} data-active={isActive || undefined}>
                <div className={styles.rowHead}>
                  <div className={styles.engine}>
                    <strong>{engine.label}</strong>
                    <span>{engine.role}</span>
                  </div>
                  <label className={styles.voice}>
                    <span className={styles.sr}>Voice for {engine.label}</span>
                    <select
                      value={voices[rowKey] ?? engine.voices[0].id}
                      onChange={(e) => {
                        setVoices((v) => ({ ...v, [rowKey]: e.target.value }));
                        if (isActive) stop();
                      }}
                    >
                      {engine.voices.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  {isActive ? (
                    <button className={styles.stop} onClick={stop}>
                      Stop
                    </button>
                  ) : (
                    <button className={styles.play} onClick={() => play(option, idx)}>
                      Play
                    </button>
                  )}
                </div>
                {engine.engine === "kokoro" && (
                  <p className={styles.hint}>
                    The first play downloads the backup voice (about 90 MB) into this browser. After that it loads
                    straight away.
                  </p>
                )}
                {stat && (
                  <p className={styles.stat} data-tone={stat.tone} role={stat.tone === "error" ? "alert" : undefined}>
                    {stat.text}
                  </p>
                )}
                {isActive && active && (
                  <ol className={styles.lines}>
                    {lines.map((line, i) => (
                      <li key={i}>
                        <button
                          className={styles.line}
                          aria-current={i === active.line || undefined}
                          data-state={i < active.line ? "past" : i === active.line ? "current" : "next"}
                          data-words={(i === active.line && active.hasWords) || undefined}
                          onClick={() => play(option, idx, i)}
                        >
                          {i === active.line && active.hasWords ? lineWithWords(line, active.token) : line}
                        </button>
                        {i === active.line && active.waiting && (
                          <span className={styles.wait}>Getting this line ready…</span>
                        )}
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            );
          })}
        </section>
      ))}
    </main>
  );
}
