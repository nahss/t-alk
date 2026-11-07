// Browser side of usage tracking and the hourly limit.
// - A random id for this browser (not personal; it's scrambled again before it's stored).
// - A fingerprint (hash) of each text, made here in the browser and never sent anywhere,
//   so replaying the same text in this visit doesn't count again.

const BROWSER_KEY = "talk-browser-id";
const COUNTED_KEY = "talk-counted-texts";
const LIMIT_KEY = "talk-limited-until";

let memoryId: string | null = null;

export function browserId(): string {
  try {
    let id = localStorage.getItem(BROWSER_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(BROWSER_KEY, id);
    }
    return id;
  } catch {
    return (memoryId ??= crypto.randomUUID());
  }
}

export async function fingerprint(text: string): Promise<string> {
  const data = new TextEncoder().encode(text.trim());
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
}

// A small store so the screen updates when these change.
const listeners = new Set<() => void>();
export function subscribeReads(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
const emit = () => listeners.forEach((f) => f());

let memCounted = "[]";
let memLimited = 0;

/** Texts already counted in this visit (this tab), as a JSON list of fingerprints. */
export function countedSnapshot(): string {
  try {
    return sessionStorage.getItem(COUNTED_KEY) ?? memCounted;
  } catch {
    return memCounted;
  }
}
export function addCounted(print: string) {
  const list: string[] = JSON.parse(countedSnapshot());
  if (list.includes(print)) return;
  memCounted = JSON.stringify([...list, print].slice(-200));
  try {
    sessionStorage.setItem(COUNTED_KEY, memCounted);
  } catch {
    // private mode etc.: counting still works for this page
  }
  emit();
}

/** When this browser's next new read unlocks (0 if it isn't limited). */
export function limitedSnapshot(): number {
  try {
    return Number(localStorage.getItem(LIMIT_KEY)) || memLimited;
  } catch {
    return memLimited;
  }
}
export function setLimitedUntil(at: number) {
  memLimited = at;
  try {
    localStorage.setItem(LIMIT_KEY, String(at));
  } catch {
    // ignore
  }
  emit();
}

export type StartResult = { allowed: true; ticket: string | null } | { allowed: false; unlockAt: number };

/** Asks the server whether this browser may start a new text (hourly limit). */
export async function startRead(): Promise<StartResult> {
  try {
    const res = await fetch("/api/reads/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ browser: browserId() }),
    });
    const data = await res.json();
    if (data?.allowed === false && data.unlockAt) return { allowed: false, unlockAt: Date.parse(data.unlockAt) };
    return { allowed: true, ticket: typeof data?.ticket === "string" ? data.ticket : null };
  } catch {
    // Can't reach Talk's counter: don't block the listener.
    return { allowed: true, ticket: null };
  }
}

export type PlayLog = { option: string; engine: string; words: number; input: "text" | "pdf"; lang: string | null };

/** Records the anonymous play row (fire and forget). */
export function logRead(ticket: string, log: PlayLog) {
  fetch("/api/reads/log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ticket, ...log }),
    keepalive: true,
  }).catch(() => undefined);
}

export async function fetchTotal(): Promise<number | null> {
  try {
    const data = await (await fetch("/api/count")).json();
    return typeof data?.total === "number" ? data.total : null;
  } catch {
    return null;
  }
}
