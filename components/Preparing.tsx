"use client";

import Link from "next/link";
import { Check, LogoBars, Spinner } from "./icons";
import styles from "./preparing.module.css";

export type Step = { label: string; state: "done" | "active" | "todo"; note?: string };

export default function Preparing({ steps, onCancel }: { steps: Step[]; onCancel: () => void }) {
  return (
    <div className={styles.page} data-theme="light">
      <div className={styles.sky} aria-hidden="true" />
      <header className={styles.header}>
        <Link
          href="/"
          className={styles.brand}
          onClick={(e) => {
            e.preventDefault();
            onCancel();
          }}
        >
            <span className={styles.brandDot}>
              <LogoBars />
            </span>
            <span className={styles.brandName}>Talk</span>
        </Link>
      </header>

      <main className={styles.main}>
        <div className={styles.column}>
          <div className={styles.top}>
            <div aria-hidden="true" className={styles.eq}>
              {[
                [16, -0.2],
                [26, -0.5],
                [32, -0.1],
                [22, -0.7],
                [14, -0.35],
              ].map(([h, d], i) => (
                <span key={i} className={styles.bar} style={{ height: h, animationDelay: `${d}s` }} />
              ))}
            </div>
            <div className={styles.words}>
              <h1 className="display">Hold on small…</h1>
              <p className="body">We start reading as soon as the first lines are ready.</p>
            </div>
          </div>

          <div className={styles.card} role="status" aria-live="polite">
            <ol className={styles.steps}>
              {steps.map((s) => (
                <li key={s.label} className={styles.step} data-state={s.state}>
                  {s.state === "done" ? (
                    <span className={styles.done}>
                      <Check size={16} style={{ strokeWidth: 2.25 }} />
                    </span>
                  ) : s.state === "active" ? (
                    <span className={styles.icon}>
                      <Spinner />
                    </span>
                  ) : (
                    <span className={styles.icon}>
                      <span className={styles.ring} />
                    </span>
                  )}
                  <span className={s.state === "active" ? "body-strong" : "body"} style={{ flex: 1 }}>
                    {s.label}
                  </span>
                  {s.note && (
                    <span className="caption" style={{ color: "var(--ink-muted)" }}>
                      {s.note}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </div>

          <div className={styles.cancelRow}>
            <button className={`${styles.cancel} body-strong`} onClick={onCancel}>
              Cancel
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
