// Languages Talk translates into, and where translation is allowed.
// Shared by browser and server: no keys here.

export type Target = { code: string; name: string; short: string };

/** Language options → the language Gemini translates into. */
export const TARGETS: Record<string, Target> = {
  pidgin: { code: "pcm", name: "Nigerian Pidgin", short: "Pidgin" },
  es: { code: "es", name: "Spanish", short: "Spanish" },
  fr: { code: "fr", name: "French", short: "French" },
};

export const TARGET_CODES = new Set(Object.values(TARGETS).map((t) => t.code));

/** Is the detected language already the one being translated into? */
export function alreadyIn(detectedCode: string | null | undefined, target: Target) {
  return !!detectedCode && detectedCode.toLowerCase().split("-")[0] === target.code;
}

/**
 * Google's free Gemini tier can't be offered to people in the EU/EEA, the UK or
 * Switzerland, so language options are switched off there (accents still work).
 */
export const NO_TRANSLATION_COUNTRIES = new Set([
  // EU
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT",
  "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE",
  // rest of the EEA
  "IS", "LI", "NO",
  // UK and Switzerland
  "GB", "CH",
]);
