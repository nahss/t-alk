// Voice catalog for the Phase 1 test page.
// No keys or secrets here: this file is shared by the browser and the server.

export type EngineId = "edge" | "yarngpt" | "kokoro";
export type SampleKey = "en" | "pcm" | "es" | "fr";
export type VoiceChoice = { id: string; label: string };

export type TestEngine = {
  engine: EngineId;
  label: string;
  role: string;
  voices: VoiceChoice[];
};

export type TestOption = {
  id: string;
  name: string;
  kind: "language" | "accent";
  sample: SampleKey;
  engines: TestEngine[];
  note?: string;
};

// Microsoft Edge voices (checked against Edge's live voice list, Nov 2026).
const EDGE = {
  ng: [
    { id: "en-NG-EzinneNeural", label: "Ezinne (female)" },
    { id: "en-NG-AbeoNeural", label: "Abeo (male)" },
  ],
  gb: [
    { id: "en-GB-SoniaNeural", label: "Sonia (female)" },
    { id: "en-GB-RyanNeural", label: "Ryan (male)" },
    { id: "en-GB-LibbyNeural", label: "Libby (female)" },
    { id: "en-GB-MaisieNeural", label: "Maisie (female, young)" },
    { id: "en-GB-ThomasNeural", label: "Thomas (male)" },
  ],
  es: [
    { id: "es-ES-ElviraNeural", label: "Elvira (female, Spain)" },
    { id: "es-ES-AlvaroNeural", label: "Álvaro (male, Spain)" },
    { id: "es-ES-XimenaNeural", label: "Ximena (female, Spain)" },
    { id: "es-MX-DaliaNeural", label: "Dalia (female, Mexico)" },
    { id: "es-MX-JorgeNeural", label: "Jorge (male, Mexico)" },
  ],
  fr: [
    { id: "fr-FR-DeniseNeural", label: "Denise (female)" },
    { id: "fr-FR-HenriNeural", label: "Henri (male)" },
    { id: "fr-FR-EloiseNeural", label: "Eloise (female, young)" },
    { id: "fr-FR-VivienneMultilingualNeural", label: "Vivienne (female, multilingual)" },
    { id: "fr-FR-RemyMultilingualNeural", label: "Rémy (male, multilingual)" },
  ],
  de: [
    { id: "de-DE-KatjaNeural", label: "Katja (female)" },
    { id: "de-DE-ConradNeural", label: "Conrad (male)" },
    { id: "de-DE-AmalaNeural", label: "Amala (female)" },
    { id: "de-DE-KillianNeural", label: "Killian (male)" },
    { id: "de-DE-SeraphinaMultilingualNeural", label: "Seraphina (female, multilingual)" },
    { id: "de-DE-FlorianMultilingualNeural", label: "Florian (male, multilingual)" },
  ],
} satisfies Record<string, VoiceChoice[]>;

// YarnGPT voices (from GET /api/v1/voices, Nov 2026). All list Pidgin and English.
const YARN: VoiceChoice[] = [
  ["idera", "Melodic, gentle"],
  ["emma", "Authoritative, deep"],
  ["osagie", "Smooth, calm"],
  ["mary", "Energetic, youthful"],
  ["adaora", "Warm, engaging"],
  ["zainab", "Soothing, gentle"],
  ["adam", "Deep, clear"],
  ["wura", "Young, sweet"],
  ["jude", "Warm, confident"],
  ["chinenye", "Engaging, warm"],
  ["tayo", "Upbeat, energetic"],
  ["regina", "Mature, warm"],
  ["femi", "Rich, reassuring"],
  ["nonso", "Bold, resonant"],
  ["remi", "Melodious, warm"],
  ["umar", "No description"],
].map(([id, d]) => ({ id, label: `${id[0].toUpperCase()}${id.slice(1)} (${d.toLowerCase()})` }));

// Kokoro voices that run in the browser (English only).
const KOKORO = {
  gb: [
    { id: "bf_emma", label: "Emma (female)" },
    { id: "bf_isabella", label: "Isabella (female)" },
    { id: "bf_alice", label: "Alice (female)" },
    { id: "bf_lily", label: "Lily (female)" },
    { id: "bm_george", label: "George (male)" },
    { id: "bm_lewis", label: "Lewis (male)" },
    { id: "bm_daniel", label: "Daniel (male)" },
    { id: "bm_fable", label: "Fable (male)" },
  ],
  en: [
    { id: "af_heart", label: "Heart (female, American)" },
    { id: "af_bella", label: "Bella (female, American)" },
    { id: "bf_emma", label: "Emma (female, British)" },
    { id: "bm_george", label: "George (male, British)" },
  ],
} satisfies Record<string, VoiceChoice[]>;

export const TEST_OPTIONS: TestOption[] = [
  {
    id: "pidgin",
    name: "Nigerian Pidgin",
    kind: "language",
    sample: "pcm",
    engines: [
      { engine: "edge", label: "Edge · Nigerian English", role: "Main voice", voices: EDGE.ng },
      { engine: "yarngpt", label: "YarnGPT", role: "Backup 1 (uses YarnGPT credits)", voices: YARN },
      { engine: "kokoro", label: "Kokoro · English (in browser)", role: "Backup 2", voices: KOKORO.en },
    ],
  },
  {
    id: "es",
    name: "Spanish",
    kind: "language",
    sample: "es",
    engines: [{ engine: "edge", label: "Edge · Spanish", role: "Only voice (no backup)", voices: EDGE.es }],
  },
  {
    id: "fr",
    name: "French",
    kind: "language",
    sample: "fr",
    engines: [{ engine: "edge", label: "Edge · French", role: "Only voice (no backup)", voices: EDGE.fr }],
  },
  {
    id: "ng",
    name: "Nigerian accent",
    kind: "accent",
    sample: "en",
    engines: [
      { engine: "edge", label: "Edge · Nigerian English", role: "Main voice", voices: EDGE.ng },
      { engine: "yarngpt", label: "YarnGPT", role: "Backup (uses YarnGPT credits)", voices: YARN },
    ],
  },
  {
    id: "gb",
    name: "British accent",
    kind: "accent",
    sample: "en",
    engines: [
      { engine: "edge", label: "Edge · British", role: "Main voice", voices: EDGE.gb },
      { engine: "kokoro", label: "Kokoro · British (in browser)", role: "Backup", voices: KOKORO.gb },
    ],
  },
  {
    id: "es-acc",
    name: "Spanish accent",
    kind: "accent",
    sample: "en",
    note: "A Spanish voice reading the English text as written. Multilingual voices may sound less accented.",
    engines: [{ engine: "edge", label: "Edge · Spanish voice", role: "Only voice (no backup)", voices: EDGE.es }],
  },
  {
    id: "fr-acc",
    name: "French accent",
    kind: "accent",
    sample: "en",
    note: "A French voice reading the English text as written. Multilingual voices may sound less accented.",
    engines: [{ engine: "edge", label: "Edge · French voice", role: "Only voice (no backup)", voices: EDGE.fr }],
  },
  {
    id: "de-acc",
    name: "German accent",
    kind: "accent",
    sample: "en",
    note: "A German voice reading the English text as written. Multilingual voices may sound less accented.",
    engines: [{ engine: "edge", label: "Edge · German voice", role: "Only voice (no backup)", voices: EDGE.de }],
  },
];

// Allow-lists the server checks requests against.
export const EDGE_VOICE_IDS = new Set(Object.values(EDGE).flat().map((v) => v.id));
export const YARN_VOICE_IDS = new Set(YARN.map((v) => v.id));
