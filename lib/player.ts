// Plays a text line by line. Audio for each line is made on demand, a few
// lines ahead of the listener, never the whole text up front.
import { alignTimings, tokenAt, type WordTiming } from "./align";

export type LineAudio = { url: string; words: WordTiming[] | null };
export type FetchLine = (index: number) => Promise<LineAudio>;

export type PlayerSnapshot = {
  /** Line being read (or about to be) */
  line: number;
  /** Word being spoken on that line, or -1 */
  token: number;
  /** The current line came with word timings */
  hasWords: boolean;
  /** How far through the current line, 0–1 */
  progress: number;
  /** The listener wants it playing */
  playing: boolean;
  /** Playing, but this line's audio isn't ready yet */
  waiting: boolean;
  /** Has any audio played yet */
  started: boolean;
  ended: boolean;
  /** Couldn't get audio for this line, even after a retry */
  failed: boolean;
  speed: number;
  /** Bumps whenever a line's audio becomes ready */
  readyVersion: number;
  /** Last line whose audio actually started playing (-1 before any) */
  lastPlayed: number;
};

const LOOKAHEAD = 3;
const KEEP_BEHIND = 20;

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class Player {
  private snap: PlayerSnapshot = {
    line: 0,
    token: -1,
    hasWords: false,
    progress: 0,
    playing: false,
    waiting: false,
    started: false,
    ended: false,
    failed: false,
    speed: 1,
    readyVersion: 0,
    lastPlayed: -1,
  };
  private listeners = new Set<() => void>();
  private pending = new Map<number, Promise<LineAudio>>();
  private ready = new Map<number, LineAudio>();
  private gen = 0;
  private raf = 0;
  private loadedLine = -1;
  private words: WordTiming[] | null = null;
  private map: number[] = [];
  private ignorePause = false;
  private destroyed = false;

  constructor(
    private lines: string[],
    private fetchLine: FetchLine,
    private audio: HTMLAudioElement,
  ) {
    audio.onended = () => this.next(true);
    audio.onerror = () => {
      if (this.loadedLine >= 0) this.fail();
    };
    audio.onpause = () => {
      if (this.ignorePause) {
        this.ignorePause = false;
        return;
      }
      if (this.loadedLine !== this.snap.line) return;
      // Paused from outside (headphones, lock screen controls).
      if (this.snap.playing && !audio.ended) {
        this.stopTicker();
        this.set({ playing: false });
      }
    };
    audio.onplay = () => {
      if (!this.snap.playing && this.loadedLine === this.snap.line) {
        this.set({ playing: true });
        this.startTicker();
      }
    };
  }

  get count() {
    return this.lines.length;
  }

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };

  getSnapshot = () => this.snap;

  isReady(i: number) {
    return this.ready.has(i);
  }

  play() {
    if (this.destroyed) return;
    if (this.snap.ended) {
      this.seek(0, true);
      return;
    }
    this.set({ playing: true, failed: false });
    if (this.loadedLine === this.snap.line && this.audio.src) {
      this.audio.play().then(
        () => this.startTicker(),
        () => this.set({ playing: false }),
      );
    } else {
      void this.start(this.snap.line);
    }
  }

  pause() {
    this.stopTicker();
    this.quietPause();
    this.set({ playing: false });
  }

  toggle() {
    if (this.snap.playing) this.pause();
    else this.play();
  }

  /** Jump to a line. Tapping a line also starts it playing. */
  seek(i: number, autoplay = this.snap.playing) {
    if (i < 0 || i >= this.lines.length) return;
    this.gen++;
    this.stopTicker();
    this.quietPause();
    this.loadedLine = -1;
    this.set({ line: i, token: -1, progress: 0, ended: false, failed: false, waiting: false, hasWords: false });
    if (autoplay) {
      this.set({ playing: true });
      void this.start(i);
    } else {
      this.prefetch(i);
    }
  }

  next(fromEnd = false) {
    const i = this.snap.line + 1;
    if (i >= this.lines.length) {
      if (fromEnd) {
        this.stopTicker();
        this.set({ playing: false, ended: true, progress: 1 });
      }
      return;
    }
    this.seek(i, fromEnd ? true : this.snap.playing);
  }

  prev() {
    this.seek(Math.max(0, this.snap.line - 1));
  }

  retry() {
    this.pending.delete(this.snap.line);
    this.set({ failed: false });
    this.seek(this.snap.line, true);
  }

  setSpeed(speed: number) {
    this.audio.playbackRate = speed;
    this.set({ speed });
  }

  destroy() {
    this.destroyed = true;
    this.gen++;
    this.stopTicker();
    this.quietPause();
    this.audio.onended = this.audio.onerror = this.audio.onpause = this.audio.onplay = null;
    this.audio.removeAttribute("src");
    for (const a of this.ready.values()) URL.revokeObjectURL(a.url);
    this.ready.clear();
    this.pending.clear();
    this.listeners.clear();
  }

  /* ---------- internals ---------- */

  private set(patch: Partial<PlayerSnapshot>) {
    this.snap = { ...this.snap, ...patch };
    this.listeners.forEach((f) => f());
  }

  private quietPause() {
    if (!this.audio.paused) {
      this.ignorePause = true;
      this.audio.pause();
    }
  }

  private ensure(i: number): Promise<LineAudio> | null {
    if (i < 0 || i >= this.lines.length) return null;
    const have = this.ready.get(i);
    if (have) return Promise.resolve(have);
    let p = this.pending.get(i);
    if (!p) {
      p = this.fetchLine(i).catch(async () => {
        await delay(800);
        return this.fetchLine(i);
      });
      this.pending.set(i, p);
      p.then(
        (a) => {
          this.pending.delete(i);
          if (this.destroyed) return URL.revokeObjectURL(a.url);
          this.ready.set(i, a);
          this.set({ readyVersion: this.snap.readyVersion + 1 });
        },
        () => this.pending.delete(i),
      );
    }
    return p;
  }

  private prefetch(from: number) {
    for (let k = from; k <= from + LOOKAHEAD; k++) this.ensure(k)?.catch(() => undefined);
    // Let go of audio far behind the listener so long texts don't fill memory.
    for (const [k, a] of this.ready) {
      if (k < from - KEEP_BEHIND || k > from + 60) {
        URL.revokeObjectURL(a.url);
        this.ready.delete(k);
      }
    }
  }

  private async start(i: number) {
    const g = ++this.gen;
    this.stopTicker();
    this.loadedLine = -1;
    this.set({ line: i, token: -1, progress: 0, waiting: !this.ready.has(i), failed: false, hasWords: false });
    this.prefetch(i);

    let a: LineAudio;
    try {
      a = await this.ensure(i)!;
    } catch {
      if (g === this.gen) this.fail();
      return;
    }
    if (g !== this.gen || this.destroyed) return;

    this.words = a.words?.length ? a.words : null;
    this.map = this.words ? alignTimings(this.lines[i].split(/\s+/), this.words) : [];
    this.quietPause();
    this.loadedLine = i;
    this.audio.src = a.url;
    this.audio.playbackRate = this.snap.speed;
    this.set({ waiting: false, hasWords: !!this.words });
    try {
      await this.audio.play();
    } catch {
      if (g === this.gen) this.set({ playing: false });
      return;
    }
    if (g !== this.gen) return;
    this.set({ started: true, lastPlayed: i });
    this.startTicker();
  }

  private fail() {
    this.stopTicker();
    this.quietPause();
    this.set({ waiting: false, failed: true, playing: false });
  }

  private startTicker() {
    this.stopTicker();
    const tick = () => {
      const ms = this.audio.currentTime * 1000;
      const dur = this.audio.duration;
      const token = this.words ? tokenAt(ms, this.words, this.map) : -1;
      const progress = dur > 0 && Number.isFinite(dur) ? Math.min(1, this.audio.currentTime / dur) : 0;
      if (token !== this.snap.token || Math.abs(progress - this.snap.progress) > 0.02) this.set({ token, progress });
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  private stopTicker() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }
}
