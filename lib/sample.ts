// The paragraph the Phase 1 test page reads through every voice.
// English and Pidgin lines come from the design file. The Spanish and French
// lines are hand-written sample translations; live translation (Gemini) is Phase 4.

import type { SampleKey } from "./voices";

export const SAMPLE: Record<SampleKey, { label: string; lines: string[] }> = {
  en: {
    label: "English (as written)",
    lines: [
      "Every morning in Lagos starts before the sun does.",
      "The generator next door coughs itself awake.",
      "Somebody’s radio is already arguing about football.",
      "The bread seller calls out, loud and sure.",
      "My mother says the day belongs to early people.",
      "So I tie my laces and step into the noise.",
    ],
  },
  pcm: {
    label: "Pidgin (from the design)",
    lines: [
      "Every morning for Lagos dey start before sun comot.",
      "Generator for next house dey cough wake up.",
      "Person radio don dey argue about football.",
      "Bread seller dey shout, loud and sure.",
      "My mama talk say day na for early people.",
      "So I tie my lace, waka enter the noise.",
    ],
  },
  es: {
    label: "Spanish (sample translation)",
    lines: [
      "Cada mañana en Lagos empieza antes que el sol.",
      "El generador de al lado tose hasta despertarse.",
      "La radio de alguien ya está discutiendo de fútbol.",
      "El vendedor de pan pregona, fuerte y seguro.",
      "Mi madre dice que el día es de los madrugadores.",
      "Así que me ato los cordones y me meto en el ruido.",
    ],
  },
  fr: {
    label: "French (sample translation)",
    lines: [
      "Chaque matin à Lagos commence avant le soleil.",
      "Le groupe électrogène d’à côté tousse pour se réveiller.",
      "La radio de quelqu’un se dispute déjà au sujet du football.",
      "Le vendeur de pain crie, fort et sûr de lui.",
      "Ma mère dit que la journée appartient aux lève-tôt.",
      "Alors je lace mes chaussures et je plonge dans le bruit.",
    ],
  },
};
