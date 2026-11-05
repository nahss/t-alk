// Small checks shared by Talk's server functions.
import { NO_TRANSLATION_COUNTRIES } from "../languages";

/** Only accept requests from Talk's own pages (stops other sites using them). */
export function fromOurSite(request: Request) {
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin") return false;
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      return new URL(origin).host === new URL(request.url).host;
    } catch {
      return false;
    }
  }
  return true;
}

/**
 * The visitor's country, from Vercel's own header. Used for this one request
 * only and never stored. Local testing: TALK_SIMULATE_COUNTRY=GB.
 */
export function countryOf(request: Request): string | null {
  if (process.env.NODE_ENV !== "production" && process.env.TALK_SIMULATE_COUNTRY) {
    return process.env.TALK_SIMULATE_COUNTRY.toUpperCase();
  }
  return request.headers.get("x-vercel-ip-country")?.toUpperCase() ?? null;
}

export function translationAllowed(request: Request) {
  const c = countryOf(request);
  return !c || !NO_TRANSLATION_COUNTRIES.has(c);
}

export const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

/**
 * Local testing only. TALK_SIMULATE_DOWN=edge,yarngpt,gemini makes those fail;
 * "edge@3" lets the first 3 requests through, then fails (a voice dropping mid-read).
 */
const simulatedCalls: Record<string, number> = {};
export function simulatedDown(engine: string) {
  if (process.env.NODE_ENV === "production") return false;
  for (const rule of (process.env.TALK_SIMULATE_DOWN ?? "").split(",")) {
    const [name, after] = rule.trim().split("@");
    if (name !== engine) continue;
    if (!after) return true;
    simulatedCalls[engine] = (simulatedCalls[engine] ?? 0) + 1;
    return simulatedCalls[engine] > Number(after);
  }
  return false;
}
