"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Home, { type PdfState } from "./Home";
import Preparing, { type Step } from "./Preparing";
import Reader from "./Reader";
import { optionById, type VoiceOption } from "@/lib/options";
import { countWords, splitLines } from "@/lib/text";
import { fileExtension, isPdf, readPdf } from "@/lib/pdf";
import { Player } from "@/lib/player";
import { speakLine } from "@/lib/speak";

type Screen = "home" | "preparing" | "reader";
type Session = { player: Player; lines: string[]; title: string; option: VoiceOption; pdfPages: number | null };

// A silent sound played inside the Play tap, so phones (iPhone especially)
// let the same audio element keep playing line after line.
const SILENCE = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";
function unlockAudio(audio: HTMLAudioElement) {
  audio.src = SILENCE;
  audio.play().catch(() => undefined);
}

const fmt = (n: number) => n.toLocaleString("en-US");

export default function TalkApp() {
  const [screen, setScreen] = useState<Screen>("home");
  const [text, setText] = useState("");
  const [pdf, setPdf] = useState<PdfState | null>(null);
  const [pick, setPick] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pdfToken = useRef(0);

  const words = pdf ? (pdf.status === "ok" ? pdf.words : 0) : countWords(text);

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

  const onPlay = () => {
    const option = optionById(pick);
    const voice = option?.edgeVoice;
    if (!option || !voice) return;
    const source = pdf?.status === "ok" ? pdf.text : text;
    const lines = splitLines(source);
    if (!lines.length) return;

    const audio = audioRef.current ?? (audioRef.current = new Audio());
    unlockAudio(audio);
    const player = new Player(lines, (i) => speakLine(lines[i], voice), audio);
    setSession({
      player,
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

  // Leave "Hold on small…" as soon as the first line starts (or can't).
  useEffect(() => {
    if (!session || screen !== "preparing") return;
    const check = () => {
      const s = session.player.getSnapshot();
      if (s.started || s.failed) setScreen("reader");
    };
    check();
    return session.player.subscribe(check);
  }, [session, screen]);

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
    return (
      <Reader
        player={session.player}
        lines={session.lines}
        title={session.title}
        option={session.option}
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
      onPick={setPick}
      onPlay={onPlay}
    />
  );
}
