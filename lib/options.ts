// The 8 voice options shown on the home screen and in the "All voices" panel,
// and the voices each one tries, in order. Shared by browser and server: no keys here.

export type OptionKind = "lang" | "acc";
export type EngineId = "edge" | "yarngpt" | "kokoro";
export type ChainStep = { engine: EngineId; voice: string };

export type VoiceOption = {
  id: string;
  kind: OptionKind;
  /** Short label used in the All voices panel */
  short: string;
  /** Full name used on cards, chips and the reader */
  name: string;
  /** Card subtitle (desktop) */
  sub: string;
  /** Card subtitle (phones) */
  subMobile: string;
  /** Hint under the name in the All voices panel */
  hint: string;
  /** Voices to try, in order. The first is the main voice; the rest are backups. */
  chain: ChainStep[];
};

const edge = (voice: string): ChainStep => ({ engine: "edge", voice });

export const OPTIONS: VoiceOption[] = [
  {
    id: "pidgin",
    kind: "lang",
    short: "Pidgin",
    name: "Pidgin",
    sub: "Translated, then read",
    subMobile: "Translated, then read",
    hint: "“How you dey?”",
    // Edge's Nigerian voice reads the Pidgin translation (fast, with word timings).
    // YarnGPT has very few free credits, so it's the backup; Kokoro is the last resort.
    // To put YarnGPT first again (e.g. after buying credits), swap the first two steps.
    chain: [edge("en-NG-EzinneNeural"), { engine: "yarngpt", voice: "idera" }, { engine: "kokoro", voice: "af_heart" }],
  },
  { id: "es", kind: "lang", short: "Spanish", name: "Spanish", sub: "Translated, then read", subMobile: "Translated, then read", hint: "“¿Qué tal?”", chain: [edge("es-ES-ElviraNeural")] },
  { id: "fr", kind: "lang", short: "French", name: "French", sub: "Translated, then read", subMobile: "Translated, then read", hint: "“Ça va ?”", chain: [edge("fr-FR-DeniseNeural")] },
  {
    id: "ng",
    kind: "acc",
    short: "Nigerian",
    name: "Nigerian accent",
    sub: "Your words, Lagos voice",
    subMobile: "Your words, Lagos",
    hint: "Lagos",
    chain: [edge("en-NG-EzinneNeural"), { engine: "yarngpt", voice: "idera" }],
  },
  {
    id: "gb",
    kind: "acc",
    short: "British",
    name: "British accent",
    sub: "Your words, London voice",
    subMobile: "Your words, London",
    hint: "London",
    chain: [edge("en-GB-SoniaNeural"), { engine: "kokoro", voice: "bf_emma" }],
  },
  { id: "es-acc", kind: "acc", short: "Spanish", name: "Spanish accent", sub: "Your words", subMobile: "Your words", hint: "Madrid", chain: [edge("es-ES-ElviraNeural")] },
  { id: "fr-acc", kind: "acc", short: "French", name: "French accent", sub: "Your words", subMobile: "Your words", hint: "Paris", chain: [edge("fr-FR-DeniseNeural")] },
  { id: "de", kind: "acc", short: "German", name: "German accent", sub: "Your words", subMobile: "Your words", hint: "Berlin", chain: [edge("de-DE-KatjaNeural")] },
];

/** The three cards in the home screen's "Pick a voice" row, as designed. */
export const HOME_CARDS = ["pidgin", "ng", "gb"];

/** Options that work right now: all eight. */
export const LIVE = new Set(["pidgin", "es", "fr", "ng", "gb", "es-acc", "fr-acc", "de"]);

export const optionById = (id: string | null | undefined) => OPTIONS.find((o) => o.id === id) ?? null;

/** Voices the public speak route accepts, per server engine. */
function allowed(engine: EngineId) {
  return new Set(
    OPTIONS.filter((o) => LIVE.has(o.id))
      .flatMap((o) => o.chain)
      .filter((s) => s.engine === engine)
      .map((s) => s.voice),
  );
}
export const SPEAK_VOICES = { edge: allowed("edge"), yarngpt: allowed("yarngpt") };
