"use client";

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import type { Player } from "@/lib/player";
import type { VoiceOption } from "@/lib/options";
import {
  ArrowLeft,
  BackLine,
  PauseIcon,
  PlayIcon,
  Retry,
  SkipLine,
  Spinner,
  Translate,
  VoiceBars,
  WifiOff,
} from "./icons";
import { useIsPhone } from "./useIsPhone";
import styles from "./reader.module.css";

const SPEEDS = [0.75, 1, 1.25, 1.5];
const speedLabel = (v: number) => `${v}×`;

type Props = {
  player: Player;
  lines: string[];
  title: string;
  option: VoiceOption;
  onBack: () => void;
};

function Words({ line, token }: { line: string; token: number }) {
  let w = -1;
  return (
    <>
      {line.split(/(\s+)/).map((part, i) => {
        if (!part || /^\s+$/.test(part)) return part;
        w++;
        const state = w < token ? "said" : w === token ? "now" : "next";
        return (
          <span key={i} className={styles.word} data-state={state}>
            {part}
          </span>
        );
      })}
    </>
  );
}

export default function Reader({ player, lines, title, option, onBack }: Props) {
  const snap = useSyncExternalStore(player.subscribe, player.getSnapshot, player.getSnapshot);
  const phone = useIsPhone();
  const stageRef = useRef<HTMLElement>(null);
  const lineRefs = useRef<(HTMLElement | null)[]>([]);
  const [offset, setOffset] = useState(0);
  const [animate, setAnimate] = useState(false);
  const [stageH, setStageH] = useState(0);

  // While the next line's audio is still being made, keep the last line lit
  // and show the "getting the next lines ready" placeholder after it.
  const buffering = snap.waiting && snap.lastPlayed === snap.line - 1;
  const shown = buffering ? snap.line - 1 : snap.line;
  const count = lines.length;
  const lineProgress = buffering ? 1 : snap.progress;
  const pct = Math.min(100, Math.round(((shown + lineProgress) / count) * 100));

  // Keep the current line centred in the stage.
  useLayoutEffect(() => {
    const el = lineRefs.current[shown];
    if (!el || !stageH) return;
    setOffset(stageH / 2 - (el.offsetTop + el.offsetHeight / 2));
  }, [shown, stageH, buffering, snap.hasWords, phone, lines]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const ro = new ResizeObserver(() => setStageH(stage.clientHeight));
    ro.observe(stage);
    setStageH(stage.clientHeight);
    // Turn on the glide only after the first position is set.
    const t = setTimeout(() => setAnimate(true), 50);
    return () => {
      ro.disconnect();
      clearTimeout(t);
    };
  }, []);

  // Pick up again automatically when the connection comes back.
  useEffect(() => {
    const onOnline = () => {
      if (player.getSnapshot().failed) player.retry();
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [player]);

  const nextIndex = Math.min(count - 1, snap.line + 1);
  const canSkip = !buffering && snap.line < count - 1 && !snap.failed;
  const status = snap.failed ? "Offline" : !snap.playing && snap.started ? "Paused" : null;
  const isAcc = option.kind === "acc";

  const cycleSpeed = () => {
    const i = SPEEDS.indexOf(snap.speed);
    player.setSpeed(SPEEDS[(i + 1) % SPEEDS.length]);
  };

  return (
    <div className={styles.page} data-theme="dark">
      <header className={styles.header}>
        <button className={`${styles.backPill} body-strong desk-only`} onClick={onBack}>
          <ArrowLeft />
          New text
        </button>
        <button className={`${styles.backCircle} phone-only`} aria-label="New text" onClick={onBack}>
          <ArrowLeft />
        </button>
        <div className={`${styles.title} subtle desk-only`}>{title}</div>
        <span className={`${styles.chip} caption`}>
          <span className={styles.tile} data-kind={option.kind}>
            {isAcc ? <VoiceBars size={14} /> : <Translate size={14} />}
          </span>
          {option.name}
        </span>
      </header>

      {snap.failed && (
        <div className={styles.note} role="alert">
          <WifiOff size={18} style={{ color: "var(--danger)" }} />
          <div className={styles.noteText}>
            <span className="subtle" style={{ fontWeight: 600, color: "var(--danger)" }}>
              Connection lost
            </span>
            <span className="caption" style={{ color: "var(--ink)" }}>
              Paused on this line. We’ll pick up right here.
            </span>
          </div>
          <button className={`${styles.retry} caption`} onClick={() => player.retry()}>
            <Retry size={14} />
            Retry
          </button>
        </div>
      )}

      <h1 className="sr">Reading {title}</h1>
      <section ref={stageRef} className={styles.stage} aria-label="Text being read">
        <div
          className={styles.track}
          style={{ transform: `translateY(${offset}px)`, transition: animate ? undefined : "none" }}
        >
          {lines.map((line, i) => {
            if (buffering && i >= snap.line) {
              if (i > snap.line) return null;
              return (
                <div key="buffer" className={styles.buffer} role="status" aria-label="Getting the next lines ready">
                  <div className={styles.sk} style={{ width: "88%" }} />
                  <div className={styles.sk} style={{ width: "54%" }} />
                  <span className={`${styles.bufferNote} caption`}>
                    <Spinner size={14} />
                    Getting the next lines ready…
                  </span>
                  <div className={styles.sk} style={{ width: "72%", opacity: 0.6, marginTop: 14 }} />
                </div>
              );
            }
            const current = i === shown;
            const withWords = current && snap.hasWords && !buffering;
            const state = i < shown ? "past" : current ? "current" : "next";
            return (
              <button
                key={i}
                ref={(el) => {
                  lineRefs.current[i] = el;
                }}
                className={`${styles.ln} ${phone ? "title" : "display"}`}
                data-state={state}
                data-words={withWords || undefined}
                aria-current={current || undefined}
                onClick={() => player.seek(i, true)}
              >
                <span className={styles.lnText}>{withWords ? <Words line={line} token={snap.token} /> : line}</span>
                {!current && (
                  <span className={`${styles.jump} caption`} aria-hidden="true">
                    <PlayIcon size={14} />
                    Jump here
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <div className={styles.controlsWrap}>
        <div className={styles.controls}>
          <div className={styles.progressRow}>
            <div aria-hidden="true" className={styles.track4}>
              <div className={styles.fill} style={{ width: `${pct}%` }} />
            </div>
            <span className={`${styles.count} caption phone-only`}>
              {shown + 1} / {count}
            </span>
          </div>
          <div className={styles.row}>
            <div className={`${styles.left} desk-only`}>
              <span className="caption" style={{ color: "var(--ink)" }}>
                Line {shown + 1} of {count}
              </span>
              <span className="caption" style={{ color: "var(--ink-muted)" }}>
                Tap any line to jump
              </span>
            </div>
            <button
              className={`${styles.speedCycle} caption phone-only`}
              data-on={snap.speed !== 1 || undefined}
              aria-label={`Speed, ${snap.speed} times. Tap to change`}
              onClick={cycleSpeed}
            >
              {speedLabel(snap.speed)}
            </button>

            <div className={styles.buttons}>
              <button className={styles.sb} aria-label="Back one line" onClick={() => player.prev()} disabled={snap.line === 0 && !buffering}>
                <BackLine size={22} />
              </button>
              <button
                className={styles.pp}
                aria-label={snap.playing ? "Pause" : "Play"}
                onClick={() => player.toggle()}
                disabled={snap.failed}
              >
                {snap.playing ? <PauseIcon /> : <PlayIcon size={24} style={{ marginLeft: 3 }} />}
              </button>
              <button
                className={styles.sb}
                aria-label="Skip one line"
                onClick={() => player.seek(nextIndex)}
                disabled={!canSkip}
              >
                <SkipLine size={22} />
              </button>
            </div>

            <div role="group" aria-label="Speed" className={`${styles.speeds} desk-only`}>
              {SPEEDS.map((v) => (
                <button
                  key={v}
                  className="caption"
                  aria-pressed={snap.speed === v}
                  onClick={() => player.setSpeed(v)}
                >
                  {speedLabel(v)}
                </button>
              ))}
            </div>
            <span className={`${styles.right} caption phone-only`}>
              {status ?? (
                <>
                  Tap a line
                  <br />
                  to jump
                </>
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
