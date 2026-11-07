"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type DragEvent, type ReactNode } from "react";
import { HOME_CARDS, LIVE, OPTIONS, optionById } from "@/lib/options";
import { WORD_LIMIT } from "@/lib/text";
import {
  Alert,
  Check,
  ChevronRight,
  Close,
  FileIcon,
  FileX,
  Lock,
  LogoBars,
  Moon,
  Clock,
  PlayIcon,
  Spinner,
  Translate,
  Upload,
  VoiceBars,
  WifiOff,
} from "./icons";
import { useIsPhone } from "./useIsPhone";
import type { LangState } from "./TalkApp";
import type { Detected } from "@/lib/translate";
import { alreadyIn, TARGETS } from "@/lib/languages";
import styles from "./home.module.css";

export type PdfState =
  | { status: "reading"; name: string }
  | { status: "ok"; name: string; pages: number; text: string; words: number }
  | { status: "scanned"; name: string; pages: number }
  | { status: "locked"; name: string }
  | { status: "broken"; name: string }
  | { status: "wrong-type"; name: string; ext: string | null };

type Props = {
  text: string;
  onText: (v: string) => void;
  pdf: PdfState | null;
  onFile: (file: File) => void;
  onRemovePdf: () => void;
  words: number;
  pick: string | null;
  onPick: (id: string) => void;
  onPlay: () => void;
  /** Options whose voices are all down right now */
  offline: Set<string>;
  /** The option that just turned out to be offline (shows the hint) */
  offlineNotice: string | null;
  /** Whether language options (translation) can be used right now */
  langState: LangState;
  /** The text's language, once Talk has worked it out */
  detected: Detected | null;
  /** The public number of texts read (null until it loads, or if it can't) */
  total: number | null;
  /** If this browser hit the hourly limit for a new text: when it unlocks */
  limitedUntil: number | null;
};

const fmt = (n: number) => n.toLocaleString("en-US");
const pages = (n: number) => `${n} ${n === 1 ? "page" : "pages"}`;
const isPdfError = (p: PdfState | null) =>
  !!p && (p.status === "scanned" || p.status === "locked" || p.status === "broken" || p.status === "wrong-type");

function pdfProblem(p: PdfState): string {
  switch (p.status) {
    case "scanned":
      return "This PDF has no readable text. Scanned PDFs aren’t supported yet.";
    case "locked":
      return "We couldn’t open this PDF. Remove the password, or try another copy.";
    case "broken":
      return "This PDF looks damaged. Try saving it again.";
    case "wrong-type":
      return p.ext
        ? `Talk can’t open ${p.ext} files. Save it as a PDF or paste the text in.`
        : "Talk can’t open this file. Save it as a PDF or paste the text in.";
    default:
      return "";
  }
}

function fileSub(p: PdfState, detected: Detected | null): ReactNode {
  switch (p.status) {
    case "reading":
      return "Reading…";
    case "ok":
      return detected ? `${pages(p.pages)} · looks like ${detected.name}` : pages(p.pages);
    case "scanned":
      return `${pages(p.pages)} · 0 words found`;
    case "locked":
      return "Password protected";
    case "broken":
      return "Damaged file";
    case "wrong-type":
      return p.ext ? `${p.ext.slice(1).toUpperCase()} file` : "Not a PDF";
  }
}

export default function Home({
  text,
  onText,
  pdf,
  onFile,
  onRemovePdf,
  words,
  pick,
  onPick,
  onPlay,
  offline,
  offlineNotice,
  langState,
  detected,
  total,
  limitedUntil,
}: Props) {
  const phone = useIsPhone();
  const [panelOpen, setPanelOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const dragDepth = useRef(0);

  const picked = optionById(pick);
  const over = words > WORD_LIMIT;
  const pdfError = isPdfError(pdf);
  const reading = pdf?.status === "reading";
  /** Why an option can't be picked right now ("" if it can) */
  const unavailable = (id: string, kind: string) =>
    !LIVE.has(id)
      ? "Coming soon"
      : offline.has(id)
        ? "Offline for now"
        : kind === "lang" && langState === "resting"
          ? "Resting, back tomorrow"
          : kind === "lang" && langState === "blocked"
            ? "Not available here"
            : "";
  const ready =
    words > 0 && !over && !!picked && !unavailable(picked.id, picked.kind) && !pdfError && !reading && !limitedUntil;
  const unlockTime = limitedUntil
    ? new Date(limitedUntil).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : null;
  const target = picked?.kind === "lang" ? TARGETS[picked.id] : null;

  // Hint under the box
  let hint: ReactNode = "";
  let hintDanger = false;
  let hintIcon: ReactNode = null;
  if (pdf && pdfError) {
    hint = pdfProblem(pdf);
    hintDanger = true;
  } else if (over) {
    hint = "Trim to 20,000 words to play";
    hintDanger = true;
  } else if (unlockTime) {
    hint = `That’s a lot of reading for one hour. Your next read unlocks at ${unlockTime}.`;
    hintIcon = <Clock size={14} />;
  } else if (offlineNotice) {
    hint = `${optionById(offlineNotice)?.short ?? "That voice"} is taking a break while we fix it. Try another voice.`;
  } else if (langState === "resting" && (!picked || picked.kind === "lang")) {
    hint = "Translation is resting, try an accent";
    hintIcon = <Moon size={14} />;
  } else if (target && detected && alreadyIn(detected.code, target)) {
    hint = `Already in ${target.short} — reading as-is`;
    hintIcon = <Check size={14} />;
  } else if (target) {
    // Languages are the only time text goes to Google.
    hint = "Text you translate is processed by Google";
  } else if (words > 0 && !picked) {
    hint = detected ? `Looks like ${detected.name}. Pick a voice above to play.` : "Pick a voice above to play.";
  }

  // All voices panel: Escape closes it, focus moves in and back out.
  useEffect(() => {
    if (!panelOpen) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPanelOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panelOpen]);

  const openPanel = (e: { currentTarget: HTMLElement }) => {
    openerRef.current = e.currentTarget;
    setPanelOpen(true);
  };
  const closePanel = () => {
    setPanelOpen(false);
    openerRef.current?.focus();
  };

  // Dropping a file anywhere else on the page shouldn't open it in the browser.
  useEffect(() => {
    const stop = (e: globalThis.DragEvent) => {
      if (e.dataTransfer?.types.includes("Files")) e.preventDefault();
    };
    window.addEventListener("dragover", stop);
    window.addEventListener("drop", stop);
    return () => {
      window.removeEventListener("dragover", stop);
      window.removeEventListener("drop", stop);
    };
  }, []);

  const hasFiles = (e: DragEvent) => e.dataTransfer.types.includes("Files");
  const dragHandlers = {
    onDragEnter: (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      dragDepth.current++;
      setDragging(true);
    },
    onDragOver: (e: DragEvent) => {
      if (hasFiles(e)) e.preventDefault();
    },
    onDragLeave: (e: DragEvent) => {
      if (!hasFiles(e)) return;
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (dragDepth.current === 0) setDragging(false);
    },
    onDrop: (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      dragDepth.current = 0;
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) onFile(file);
    },
  };

  const chooseFile = () => fileInput.current?.click();

  const countEl = unlockTime ? (
    <span className="caption" style={{ color: "var(--ink-muted)" }}>
      Back at {unlockTime}
    </span>
  ) : (
    <span className="caption" style={{ color: over ? "var(--danger)" : "var(--ink-muted)" }}>
      <b style={{ color: over ? undefined : "var(--ink)" }}>{fmt(words)}</b> / 20,000 words
    </span>
  );

  const playButton = unlockTime ? (
    <button className={styles.play} aria-label={`Play, unavailable until ${unlockTime}`} disabled>
      <Clock size={18} />
    </button>
  ) : ready ? (
    <button className={styles.play} aria-label="Play" onClick={onPlay}>
      <PlayIcon />
    </button>
  ) : (
    <button className={styles.play} aria-label="Play" disabled>
      <PlayIcon />
    </button>
  );

  return (
    <div className={styles.page} data-theme="light">
      <div className={styles.sky} aria-hidden="true" />

      <header className={styles.header}>
        <Link href="/" className={styles.brand}>
            <span className={styles.brandTile}>
              <LogoBars size={phone ? 17 : 18} />
            </span>
            <span className={styles.brandName}>Talk</span>
        </Link>
        <nav aria-label="Site" className={styles.nav}>
          {total != null && total > 0 && (
            <>
              <span className={`${styles.navpill} ${styles.counter} subtle desk-only`}>
                <span className={styles.dot} />
                <b>{fmt(total)}</b> texts read
              </span>
              <span className={`${styles.navpill} ${styles.counter} caption phone-only`}>
                <span className={styles.dot} />
                <b>{fmt(total)}</b> read
              </span>
            </>
          )}
          <button className={`${styles.navpill} subtle desk-only`} style={{ fontWeight: 600 }} onClick={openPanel}>
            <VoiceBars size={18} />
            All voices
          </button>
          <button className={`${styles.navpill} ${styles.navIcon} phone-only`} aria-label="All voices" onClick={openPanel}>
            <VoiceBars size={18} />
          </button>
        </nav>
      </header>

      <main className={styles.main}>
        <div className={styles.column}>
          <div className={styles.hero}>
              <div aria-hidden="true" className={styles.heroRing}>
                <span className={styles.heroDot}>
                  <LogoBars size={phone ? 20 : 24} />
                </span>
              </div>
            <h1 className="display">
              Got something to read?
              <br />
              Let’s hear it.
            </h1>
          </div>

          <section className={styles.voices} aria-labelledby="voices-h">
            <div className={styles.voicesHead}>
              <h2 id="voices-h" className="body-strong">
                Pick a voice
              </h2>
              <button className={`${styles.seeAll} caption`} onClick={openPanel}>
                <span className="desk-only">See all voices</span>
                <span className="phone-only">See all</span>
                <ChevronRight size={14} style={{ display: phone ? "none" : undefined }} />
              </button>
            </div>
            <div className={styles.cards}>
              {HOME_CARDS.map((id) => {
                const o = optionById(id)!;
                const on = pick === id;
                const why = unavailable(id, o.kind);
                const down = why === "Offline for now";
                return (
                  <button
                    key={id}
                    className={styles.vcard}
                    aria-pressed={on}
                    data-on={on || undefined}
                    disabled={!!why}
                    aria-describedby={down ? `${id}-off` : undefined}
                    onClick={() => onPick(id)}
                  >
                    <span className={styles.vcardText}>
                      <span className="body-strong">{o.name}</span>
                      {down ? (
                        <span id={`${id}-off`} className={`${styles.offline} caption`}>
                          <WifiOff size={12} />
                          Offline for now
                        </span>
                      ) : (
                        <span className="caption" style={{ color: "var(--ink-muted)" }}>
                          {why || (phone ? o.subMobile : o.sub)}
                        </span>
                      )}
                    </span>
                    {on && (
                      <span className={styles.check}>
                        <Check size={14} style={{ strokeWidth: 2.5 }} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

            <div
              className={styles.composer}
              data-danger={over || pdfError || undefined}
              {...(phone ? {} : dragHandlers)}
            >
              {dragging ? (
                <div className={`${styles.field} ${styles.drop}`}>
                  <Upload size={24} />
                  <span className="body-strong">Drop your PDF to read it</span>
                  <span className="caption" style={{ color: "var(--ink-muted)" }}>
                    Text-only PDFs, up to 20,000 words
                  </span>
                </div>
              ) : pdf ? (
                <div className={styles.field}>
                  <div className={styles.fileRow}>
                    <span
                      className={styles.ftile}
                      data-danger={pdfError || undefined}
                    >
                      {pdf.status === "reading" ? (
                        <Spinner />
                      ) : pdf.status === "locked" ? (
                        <Lock />
                      ) : pdfError ? (
                        <FileX />
                      ) : (
                        <FileIcon />
                      )}
                    </span>
                    <div className={styles.fileText}>
                      <div className="body-strong">{pdf.name}</div>
                      <div className="caption" style={{ color: "var(--ink-muted)" }}>
                        {fileSub(pdf, detected)}
                      </div>
                    </div>
                    <button className={styles.x} aria-label="Remove PDF" onClick={onRemovePdf}>
                      <Close />
                    </button>
                  </div>
                  {!pdfError && <div className={`${styles.fieldCount} phone-only`}>{countEl}</div>}
                </div>
              ) : (
                <div className={styles.field}>
                  <label htmlFor="talk-text" className="sr">
                    Text to read aloud
                  </label>
                  <textarea
                    id="talk-text"
                    className={`${styles.textarea} body`}
                    value={text}
                    onChange={(e) => onText(e.target.value)}
                    placeholder={phone ? "Paste your text here…" : "Paste your text here, or drop a PDF on this box…"}
                  />
                  <div className={`${styles.fieldCount} phone-only`}>{countEl}</div>
                </div>
              )}

              {dragging ? (
                <div className={styles.bar} style={{ opacity: 0.4 }} aria-hidden="true">
                  <span className={`${styles.tool} caption`}>Upload PDF</span>
                  <div style={{ flex: 1 }} />
                  <span className="caption" style={{ color: "var(--ink-muted)" }}>
                    {fmt(words)} / 20,000 words
                  </span>
                </div>
              ) : pdfError ? (
                <div className={styles.bar}>
                  <button className={`${styles.tool} caption`} onClick={chooseFile}>
                    Try another PDF
                  </button>
                  <div style={{ flex: 1 }} />
                  {playButton}
                </div>
              ) : (
                <div className={styles.bar}>
                  <button className={`${styles.tool} caption`} onClick={chooseFile} aria-label={phone ? (pdf ? "Replace PDF" : "Upload PDF") : undefined}>
                    <FileIcon size={phone ? 15 : 16} />
                    <span className="desk-only">{pdf ? "Replace PDF" : "Upload PDF"}</span>
                    <span className="phone-only">PDF</span>
                  </button>
                  <button
                    className={`${styles.tool} caption`}
                    style={{ color: picked ? "var(--ink)" : "var(--ink-muted)" }}
                    onClick={openPanel}
                  >
                    <VoiceBars size={phone ? 15 : 16} />
                    {picked ? picked.name : "No voice yet"}
                  </button>
                  <div style={{ flex: 1 }} />
                  <span className="desk-only">{countEl}</span>
                  {playButton}
                </div>
              )}
            </div>
          <p
            className={`${styles.hint} caption`}
            style={{ color: hintDanger ? "var(--danger)" : "var(--ink-muted)" }}
            role={hintDanger ? "alert" : undefined}
          >
            {hintDanger ? <Alert size={14} /> : hintIcon}
            {hint}
          </p>

          <input
            ref={fileInput}
            type="file"
            accept="application/pdf,.pdf"
            className="sr"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
              e.target.value = "";
            }}
          />
        </div>
      </main>

      <div
        className={styles.scrim}
        aria-hidden="true"
        data-open={panelOpen || undefined}
        onClick={closePanel}
      />
      <aside
        ref={panelRef}
        className={styles.panel}
        aria-label="All voices"
        aria-hidden={!panelOpen}
        inert={!panelOpen}
        data-open={panelOpen || undefined}
      >
        <div className={styles.panelHead}>
          <div className={styles.panelTitle}>
            <h2 className="title">All voices</h2>
            <span className="caption" style={{ color: "var(--ink-muted)" }}>
              Languages are translated first. Accents keep your words.
            </span>
          </div>
          <button ref={closeRef} className={styles.close} aria-label="Close" onClick={closePanel}>
            <Close />
          </button>
        </div>
        <div className={styles.panelBody}>
          {(["lang", "acc"] as const).map((kind, idx) => (
            <div key={kind} style={{ display: "contents" }}>
              {idx === 1 && <div className={styles.divider} />}
              <fieldset className={styles.group}>
                <legend className="sr">{kind === "lang" ? "Languages" : "Accents"}</legend>
                <div className={styles.groupHead}>
                  <span className={styles.groupTile} data-kind={kind}>
                    {kind === "lang" ? <Translate /> : <VoiceBars />}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div className="body-strong">{kind === "lang" ? "Languages" : "Accents"}</div>
                    <div className="caption" style={{ color: "var(--ink-muted)" }}>
                      {kind === "lang" ? "Hello → Hola" : "Hello → Hello"}
                    </div>
                  </div>
                </div>
                <div className={styles.optGrid}>
                  {OPTIONS.filter((o) => o.kind === kind).map((o) => {
                    const on = pick === o.id;
                    const why = unavailable(o.id, o.kind);
                    return (
                      <button
                        key={o.id}
                        className={styles.opt}
                        aria-pressed={on}
                        data-on={on || undefined}
                        disabled={!!why}
                        onClick={() => {
                          onPick(o.id);
                          closePanel();
                        }}
                      >
                        <span className="body-strong">{o.short}</span>
                        <span className="caption" style={{ color: "var(--ink-muted)" }}>
                          {why || o.hint}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
