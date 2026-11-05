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

type Screen = "home" | "preparing" | "reader";
type Session = {
  player: Player;
  chain: VoiceChain;
  lines: string[];
  title: string;
  option: VoiceOption;
  pdfPages: number | null;
};

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
const noChain = { subscribe: () => () => undefined, current: 0 };

export default function TalkApp() {
  const [screen, setScreen] = useState<Screen>("home");
  const [text, setText] = useState("");
  const [pdf, setPdf] = useState<PdfState | null>(null);
  const [pick, setPick] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [offlineUntil, setOfflineUntil] = useState<Record<string, number>>({});
  const [offlineNotice, setOfflineNotice] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pdfToken = useRef(0);

  const words = pdf ? (pdf.status === "ok" ? pdf.words : 0) : countWords(text);

  // Which voice in the chain is reading (0 = main voice, 1+ = a backup).
  const chain = session?.chain ?? noChain;
  const voiceIndex = useSyncExternalStore(
    chain.subscribe,
    () => chain.current,
    () => 0,
  );

  // Options marked offline. Marks expire on their own so Talk tries again later.
  const [now, setNow] = useState(0);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const t = setInterval(tick, 30_000);
    return () => clearInterval(t);
  }, []);
  const offline = new Set(Object.keys(offlineUntil).filter((id) => offlineUntil[id] > now));

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

  const onPlay = () => {
    const option = optionById(pick);
    if (!option || !LIVE.has(option.id) || !option.chain.length) return;
    const source = pdf?.status === "ok" ? pdf.text : text;
    const lines = splitLines(source);
    if (!lines.length) return;

    const audio = audioRef.current ?? (audioRef.current = new Audio());
    unlockAudio(audio);
    const voices = new VoiceChain(option.chain);
    const player = new Player(lines, (i) => voices.speak(lines[i]), audio);
    setSession({
      player,
      chain: voices,
      lines,
      option,
      title: pdf?.status === "ok" ? pdf.name : `Pasted text · ${fmt(words)} words`,
      pdfPages: pdf?.status === "ok" ? pdf.pages : null,
    });
    setScreen("preparing");
    window.history.pushState({ talk: "read" }, "");
    window.scrollTo(0, 0);
    player.play();
  };

  const endSession = useCallback(() => {
    setSession((s) => {
      s?.player.destroy();
      return null;
    });
    setScreen("home");
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

  // Leave "Hold on small…" as soon as the first line starts. If every voice for
  // this option is down before anything plays, go back home and say so.
  useEffect(() => {
    if (!session || screen !== "preparing") return;
    const check = () => {
      const s = session.player.getSnapshot();
      if (s.started) setScreen("reader");
      else if (s.failed && s.failReason === "offline") {
        const id = session.option.id;
        const at = Date.now();
        setNow(at);
        setOfflineUntil((o) => ({ ...o, [id]: at + OFFLINE_FOR_MS }));
        setOfflineNotice(id);
        setPick(null);
        goHome();
      } else if (s.failed) setScreen("reader");
    };
    check();
    return session.player.subscribe(check);
  }, [session, screen, goHome]);

  // The reader is dark; match the page behind it so overscroll doesn't flash white.
  useEffect(() => {
    document.body.style.background = screen === "reader" ? "#0e0f12" : "";
  }, [screen]);

  if (screen === "preparing" && session) {
    const steps: Step[] = [];
    if (session.pdfPages != null) {
      steps.push({ label: "Reading your PDF", state: "done", note: `${session.pdfPages} ${session.pdfPages === 1 ? "page" : "pages"}` });
    }
    steps.push({ label: "Getting the voice ready", state: "active" });
    return <Preparing steps={steps} onCancel={goHome} />;
  }

  if (screen === "reader" && session) {
    const backupStep = voiceIndex > 0 ? session.option.chain[voiceIndex] : null;
    return (
      <Reader
        player={session.player}
        lines={session.lines}
        title={session.title}
        option={session.option}
        backup={backupStep}
        onBack={goHome}
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
      pick={pick}
      onPick={onPick}
      onPlay={onPlay}
      offline={offline}
      offlineNotice={offlineNotice && offline.has(offlineNotice) ? offlineNotice : null}
    />
  );
}
