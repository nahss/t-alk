// The 8 voice options shown on the home screen and in the "All voices" panel.
// Shared by the browser and the server: no keys here.

export type OptionKind = "lang" | "acc";

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
  /** Main Edge voice for this option (Phase 2 only wires British). */
  edgeVoice?: string;
};

export const OPTIONS: VoiceOption[] = [
  { id: "pidgin", kind: "lang", short: "Pidgin", name: "Pidgin", sub: "Translated, then read", subMobile: "Translated, then read", hint: "“How you dey?”" },
  { id: "es", kind: "lang", short: "Spanish", name: "Spanish", sub: "Translated, then read", subMobile: "Translated, then read", hint: "“¿Qué tal?”" },
  { id: "fr", kind: "lang", short: "French", name: "French", sub: "Translated, then read", subMobile: "Translated, then read", hint: "“Ça va ?”" },
  { id: "ng", kind: "acc", short: "Nigerian", name: "Nigerian accent", sub: "Your words, Lagos voice", subMobile: "Your words, Lagos", hint: "Lagos" },
  { id: "gb", kind: "acc", short: "British", name: "British accent", sub: "Your words, London voice", subMobile: "Your words, London", hint: "London", edgeVoice: "en-GB-SoniaNeural" },
  { id: "es-acc", kind: "acc", short: "Spanish", name: "Spanish accent", sub: "Your words", subMobile: "Your words", hint: "Madrid" },
  { id: "fr-acc", kind: "acc", short: "French", name: "French accent", sub: "Your words", subMobile: "Your words", hint: "Paris" },
  { id: "de", kind: "acc", short: "German", name: "German accent", sub: "Your words", subMobile: "Your words", hint: "Berlin" },
];

/** The three cards in the home screen's "Pick a voice" row, as designed. */
export const HOME_CARDS = ["pidgin", "ng", "gb"];

/** Options that work right now. Phase 2: British only. Phases 3–5 switch the rest on. */
export const LIVE = new Set(["gb"]);

export const optionById = (id: string | null | undefined) => OPTIONS.find((o) => o.id === id) ?? null;

/** Edge voices the public speak route accepts. */
export const SPEAK_VOICES = new Set(
  OPTIONS.filter((o) => LIVE.has(o.id) && o.edgeVoice).map((o) => o.edgeVoice as string),
);
