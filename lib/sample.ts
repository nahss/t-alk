// The paragraphs the private test page reads through every voice.
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

// Names are where voices usually stumble first: Yoruba, Igbo and Hausa names,
// Nigerian places and food. Translations keep every name exactly as written.
export const NAMES: Record<SampleKey, { label: string; lines: string[] }> = {
  en: {
    label: "Names test, English (as written)",
    lines: [
      "Oluwaseun and Chidinma met Adaeze at the gate of Tafawa Balewa Square.",
      "Babatunde drove from Ibadan to Abeokuta, then on to Ijebu-Ode.",
      "Funmilayo bought suya, ofada rice and agege bread in Surulere.",
      "Emeka Nwachukwu took a danfo from Oshodi to Ajah on the Lekki-Epe Expressway.",
      "Aisha, Musa and Zainab flew from Kano to Port Harcourt via Abuja.",
      "Ngozi, Ifeoma and Tobiloba shared jollof, egusi soup and puff-puff in Enugu.",
    ],
  },
  pcm: {
    label: "Names test, Pidgin",
    lines: [
      "Oluwaseun and Chidinma jam Adaeze for Tafawa Balewa Square gate.",
      "Babatunde drive from Ibadan go Abeokuta, then e reach Ijebu-Ode.",
      "Funmilayo buy suya, ofada rice and agege bread for Surulere.",
      "Emeka Nwachukwu enter danfo from Oshodi go Ajah for Lekki-Epe Expressway.",
      "Aisha, Musa and Zainab fly from Kano go Port Harcourt through Abuja.",
      "Ngozi, Ifeoma and Tobiloba share jollof, egusi soup and puff-puff for Enugu.",
    ],
  },
  es: {
    label: "Names test, Spanish",
    lines: [
      "Oluwaseun y Chidinma se encontraron con Adaeze en la entrada de Tafawa Balewa Square.",
      "Babatunde condujo de Ibadan a Abeokuta y luego siguió hasta Ijebu-Ode.",
      "Funmilayo compró suya, arroz ofada y pan agege en Surulere.",
      "Emeka Nwachukwu tomó un danfo de Oshodi a Ajah por la autopista Lekki-Epe.",
      "Aisha, Musa y Zainab volaron de Kano a Port Harcourt pasando por Abuja.",
      "Ngozi, Ifeoma y Tobiloba compartieron jollof, sopa de egusi y puff-puff en Enugu.",
    ],
  },
  fr: {
    label: "Names test, French",
    lines: [
      "Oluwaseun et Chidinma ont retrouvé Adaeze à l’entrée de Tafawa Balewa Square.",
      "Babatunde a roulé d’Ibadan à Abeokuta, puis jusqu’à Ijebu-Ode.",
      "Funmilayo a acheté du suya, du riz ofada et du pain agege à Surulere.",
      "Emeka Nwachukwu a pris un danfo d’Oshodi à Ajah sur l’autoroute Lekki-Epe.",
      "Aisha, Musa et Zainab ont pris l’avion de Kano à Port Harcourt via Abuja.",
      "Ngozi, Ifeoma et Tobiloba ont partagé du jollof, de la soupe egusi et des puff-puff à Enugu.",
    ],
  },
};
