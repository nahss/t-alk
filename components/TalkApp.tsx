"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Home, { type PdfState } from "./Home";
import Preparing, { type Step } from "./Preparing";
import Reader from "./Reader";
import { LIVE, optionById, type VoiceOption } from "@/lib/options";
import { countWords, splitLines } from "@/lib/text";
import { fileExtension, isPdf, readPdf } from "@/lib/pdf";
import { Player } from "@/lib/player";
import { VoiceChain } from "@/lib/speak";
import { withTransition } from "@/lib/transition";
import { alreadyIn, TARGETS } from "@/lib/languages";
import { detectionKey, detectLanguage, Translation, type Detected } from "@/lib/translate";

type Screen = "home" | "preparing" | "reader";
/** accent = read as written; translated = read the translation; asis = already in the chosen language */
export type ReadMode = "accent" | "translated" | "asis";
type Session = {
  player: Player;
  chain: VoiceChain;
  lines: string[];
  title: string;
  option: VoiceOption;
  translation: Translation | null;
  mode: ReadMode;
};
type StepState = Step["state"];
type Prep = {
  pdfPages: number | null;
  detect: StepState | null;
  detectName: string | null;
  translate: StepState | null;
  batch: string | null;
};
/** ok = languages available; resting = Gemini's free allowance is used up; blocked = not offered in this country */
export type LangState = "ok" | "resting" | "blocked";

// A silent sound played inside the Play tap, so phones (iPhone especially)
// let the same audio element keep playing line after line.
const SILENCE = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";
function unlockAudio(audio: HTMLAudioElement) {
  audio.src = SILENCE;
  audio.play().catch(() => undefined);
}

/** How long an option stays marked "Offline for now" before Talk tries it again. */
const OFFLINE_FOR_MS = 5 * 60 * 1000;

const fmt = (n: number) => n.toLocaleString("en-US");
const noStore = { subscribe: () => () => undefined, current: 0, getVersion: () => 0 };

export default function TalkApp() {
  const [screen, setScreen] = useState<Screen>("home");
  const [text, setText] = useState("");
  const [pdf, setPdf] = useState<PdfState | null>(null);
  const [pick, setPick] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [prep, setPrep] = useState<Prep | null>(null);
  const [offlineUntil, setOfflineUntil] = useState<Record<string, number>>({});
  const [offlineNotice, setOfflineNotice] = useState<string | null>(null);
  const [region, setRegion] = useState<"ok" | "blocked">("ok");
  const [resting, setResting] = useState(false);
  const [detected, setDetected] = useState<(Detected & { key: string }) | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pdfToken = useRef(0);
  const readToken = useRef(0);

  const words = pdf ? (pdf.status === "ok" ? pdf.words : 0) : countWords(text);
  const source = pdf ? (pdf.status === "ok" ? pdf.text : "") : text;
  const langState: LangState = region === "blocked" ? "blocked" : resting ? "resting" : "ok";

  // Which voice in the chain is reading (0 = main voice, 1+ = a backup).
  const chain = session?.chain ?? noStore;
  const voiceIndex = useSyncExternalStore(chain.subscribe, () => chain.current, () => 0);
  // Re-render as translation batches arrive.
  const tr = session?.translation ?? noStore;
  useSyncExternalStore(tr.subscribe, tr.getVersion, () => 0);

  // Options marked offline. Marks expire on their own so Talk tries again later.
  const [now, setNow] = useState(0);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const t = setInterval(tick, 30_000);
    return () => clearInterval(t);
  }, []);
  const offline = new Set(Object.keys(offlineUntil).filter((id) => offlineUntil[id] > now));

  // Can languages be offered here? (The server checks the country; nothing is stored.)
  useEffect(() => {
    fetch("/api/region")
      .then((r) => r.json())
      .then((d) => setRegion(d.languages === false ? "blocked" : "ok"))
      .catch(() => undefined);
  }, []);

  // Work out the text's language about a second after typing stops (straight away for PDFs).
  const key = detectionKey(source);
  useEffect(() => {
    if (langState !== "ok" || countWords(key) < 3 || detected?.key === key) return;
    const t = setTimeout(
      () => {
        detectLanguage(key).then(
          (d) => setDetected({ key, ...d }),
          (err: { kind?: string }) => {
            if (err?.kind === "translation") setResting(true);
            else if (err?.kind === "region") setRegion("blocked");
          },
        );
      },
      pdf ? 0 : 1000,
    );
    return () => clearTimeout(t);
  }, [key, langState, detected?.key, pdf]);
  const detectedNow = detected && detected.key === key ? detected : null;

  // If languages become unavailable while one is picked, treat it as unpicked.
  const pickedOption = optionById(pick);
  const activePick = pickedOption?.kind === "lang" && langState !== "ok" ? null : pick;

  const onFile = useCallback(async (file: File) => {
    const t = ++pdfToken.current;
    if (!isPdf(file)) {
      setPdf({ status: "wrong-type", name: file.name, ext: fileExtension(file) });
      return;
    }
    setPdf({ status: "reading", name: file.name });
    const r = await readPdf(file);
    if (t !== pdfToken.current) return;
    if (r.ok) setPdf({ status: "ok", name: file.name, pages: r.pages, text: r.text, words: r.words });
    else if (r.reason === "scanned") setPdf({ status: "scanned", name: file.name, pages: r.pages });
    else setPdf({ status: r.reason, name: file.name });
  }, []);

  const onRemovePdf = useCallback(() => {
    pdfToken.current++;
    setPdf(null);
  }, []);

  const onPick = useCallback((id: string) => {
    setPick(id);
    setOfflineNotice(null);
  }, []);

  const endSession = useCallback(() => {
    readToken.current++;
    withTransition(() => {
      setSession((s) => {
        s?.player.destroy();
        return null;
      });
      setPrep(null);
      setScreen("home");
    });
  }, []);

  // "New text", Cancel and the browser's back button all lead home.
  const goHome = useCallback(() => {
    if (window.history.state?.talk === "read") window.history.back();
    else endSession();
  }, [endSession]);

  useEffect(() => {
    window.addEventListener("popstate", endSession);
    return () => window.removeEventListener("popstate", endSession);
  }, [endSession]);

  const markOffline = useCallback((id: string) => {
    const at = Date.now();
    setNow(at);
    setOfflineUntil((o) => ({ ...o, [id]: at + OFFLINE_FOR_MS }));
    setOfflineNotice(id);
  }, []);

  const onPlay = () => {
    const option = optionById(activePick);
    if (!option || !LIVE.has(option.id) || !option.chain.length) return;
    const lines = splitLines(source);
    if (!lines.length) return;

    const audio = audioRef.current ?? (audioRef.current = new Audio());
    unlockAudio(audio);
    const target = option.kind === "lang" ? TARGETS[option.id] : null;
    const voices = new VoiceChain(option.chain);
    const pdfPages = pdf?.status === "ok" ? pdf.pages : null;
    const title = pdf?.status === "ok" ? pdf.name : `Pasted text · ${fmt(words)} words`;
    const readId = ++readToken.current;
    const known = detectedNow;

    setPrep({
      pdfPages,
      detect: target ? (known ? "done" : "active") : null,
      detectName: known?.name ?? null,
      translate: target ? "todo" : null,
      batch: null,
    });
    // Screen changes run as transitions so the shared pieces glide across.
    withTransition(() => setScreen("preparing"));
    window.history.pushState({ talk: "read" }, "");
    window.scrollTo(0, 0);

    const begin = (mode: ReadMode, translation: Translation | null) => {
      if (readId !== readToken.current) return;
      const player = new Player(
        lines,
        async (i) => {
          if (!translation) return voices.speak(lines[i]);
          const line = await translation.line(i);
          translation.prefetch(i);
          return voices.speak(line);
        },
        audio,
        translation ? (i) => translation.translated[i] ?? lines[i] : undefined,
      );
      setSession({ player, chain: voices, lines, option, title, translation, mode });
      if (translation) setPrep((p) => p && { ...p, translate: "active", batch: `Lines 1–${translation.firstBatchSize}` });
      player.play();
    };

    if (!target) return begin("accent", null);

    const decide = (d: Detected | null) =>
      alreadyIn(d?.code, target) ? begin("asis", null) : begin("translated", new Translation(lines, option.id));

    if (known) return decide(known);
    detectLanguage(source).then(
      (d) => {
        if (readId !== readToken.current) return;
        setDetected({ key: detectionKey(source), ...d });
        setPrep((p) => p && { ...p, detect: "done", detectName: d.name });
        decide(d);
      },
      (err: { kind?: string }) => {
        if (readId !== readToken.current) return;
        if (err?.kind === "translation") {
          setResting(true);
          goHome();
        } else if (err?.kind === "region") {
          setRegion("blocked");
          goHome();
        } else {
          // Couldn't tell the language: translate anyway (lines already in the
          // chosen language come back unchanged).
          setPrep((p) => p && { ...p, detect: "done", detectName: null });
          decide(null);
        }
      },
    );
  };

  // Leave "Hold on small…" as soon as the first line starts. If it can't start
  // (every voice down, translation resting or not offered here), go home and say so.
  useEffect(() => {
    if (!session || screen !== "preparing") return;
    const check = () => {
      const s = session.player.getSnapshot();
      if (s.started) withTransition(() => setScreen("reader"));
      else if (s.failed && s.failReason === "offline") {
        markOffline(session.option.id);
        setPick(null);
        goHome();
      } else if (s.failed && s.failReason === "translation") {
        setResting(true);
        goHome();
      } else if (s.failed && s.failReason === "region") {
        setRegion("blocked");
        goHome();
      } else if (s.failed) withTransition(() => setScreen("reader"));
    };
    check();
    return session.player.subscribe(check);
  }, [session, screen, goHome, markOffline]);

  // Partway through a read: if every voice stops, mark the option offline for Home;
  // if translation runs out, mark languages resting.
  useEffect(() => {
    if (!session || screen !== "reader") return;
    let marked = false;
    return session.player.subscribe(() => {
      const s = session.player.getSnapshot();
      if (s.failed && !marked) {
        marked = true;
        if (s.failReason === "offline") markOffline(session.option.id);
        if (s.failReason === "translation") setResting(true);
      } else if (!s.failed) marked = false;
    });
  }, [session, screen, markOffline]);

  const onRetry = useCallback(() => {
    if (!session) return;
    // Give the main voice (and translation) another chance.
    session.chain.reset();
    setOfflineUntil((o) => {
      const next = { ...o };
      delete next[session.option.id];
      return next;
    });
    setOfflineNotice(null);
    setResting(false);
    session.player.retry();
  }, [session]);

  // The reader is dark; match the page behind it so overscroll doesn't flash white.
  useEffect(() => {
    document.body.style.background = screen === "reader" ? "#0e0f12" : "";
  }, [screen]);

  if (screen === "preparing" && prep) {
    const translation = session?.translation ?? null;
    const target = session ? TARGETS[session.option.id] : activePick ? TARGETS[activePick] : undefined;
    const firstReady = translation ? translation.translated[0] != null : false;
    const translateState: StepState | null =
      !prep.translate || session?.mode === "asis" ? null : translation ? (firstReady ? "done" : "active") : "todo";

    const steps: Step[] = [];
    if (prep.pdfPages != null) {
      steps.push({ label: "Reading your PDF", state: "done", note: `${prep.pdfPages} ${prep.pdfPages === 1 ? "page" : "pages"}` });
    }
    if (prep.detect) {
      steps.push({
        label: "Detecting the language",
        state: prep.detect,
        note: prep.detect === "done" && prep.detectName ? prep.detectName : undefined,
      });
    }
    if (translateState && target) {
      steps.push({ label: `Translating to ${target.short}`, state: translateState, note: prep.batch ?? undefined });
    }
    const voiceReady = !!session && (!translateState || translateState === "done");
    steps.push({ label: "Getting the voice ready", state: voiceReady ? "active" : "todo" });
    return <Preparing steps={steps} onCancel={goHome} />;
  }

  if (screen === "reader" && session) {
    const backupStep = voiceIndex > 0 ? session.option.chain[voiceIndex] : null;
    return (
      <Reader
        player={session.player}
        lines={session.lines}
        translated={session.translation?.translated ?? null}
        title={session.title}
        option={session.option}
        backup={backupStep}
        onBack={goHome}
        onRetry={onRetry}
      />
    );
  }

  return (
    <Home
      text={text}
      onText={setText}
      pdf={pdf}
      onFile={onFile}
      onRemovePdf={onRemovePdf}
      words={words}
      pick={activePick}
      onPick={onPick}
      onPlay={onPlay}
      offline={offline}
      offlineNotice={offlineNotice && offline.has(offlineNotice) ? offlineNotice : null}
      langState={langState}
      detected={detectedNow}
    />
  );
}
