// Google Gemini (free tier, Flash-Lite). Server only: uses GEMINI_API_KEY.
// Tries the main model first and a second Flash-Lite model if the first is busy
// or out of free allowance (each model has its own daily allowance).

const MODELS = [
  process.env.GEMINI_MODEL || "gemini-3.1-flash-lite",
  process.env.GEMINI_FALLBACK_MODEL || "gemini-3.5-flash-lite",
];
const URL_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

/** The free daily allowance is used up on every model: translation is "resting". */
export class GeminiResting extends Error {}
/** Google is overloaded right now; try again in a few minutes. */
export class GeminiBusy extends Error {}
export class GeminiError extends Error {}

type Schema = Record<string, unknown>;

/** Asks Gemini for JSON matching `schema`. */
export async function geminiJson<T>(system: string, input: unknown, schema: Schema): Promise<T> {
  let resting = false;
  let busy = false;
  for (const model of MODELS) {
    try {
      return await callModel<T>(model, system, input, schema);
    } catch (err) {
      if (err instanceof GeminiResting) resting = true;
      else if (err instanceof GeminiBusy) busy = true;
      else throw err;
    }
  }
  if (busy) throw new GeminiBusy("Gemini is busy");
  if (resting) throw new GeminiResting("Gemini quota reached");
  throw new GeminiError("No Gemini model answered");
}

async function callModel<T>(model: string, system: string, input: unknown, schema: Schema, retried = false): Promise<T> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new GeminiError("GEMINI_API_KEY is not set");

  let res: Response;
  try {
    res = await fetch(`${URL_BASE}/${model}:generateContent`, {
      method: "POST",
      headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: JSON.stringify(input) }] }],
        generationConfig: { temperature: 0.2, responseMimeType: "application/json", responseSchema: schema },
      }),
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    throw new GeminiBusy("Gemini didn't answer in time");
  }

  if (res.status === 429) {
    // A per-minute limit says "retry in N s"; wait once if it's short. Otherwise it's resting.
    const wait = await retryDelaySeconds(res);
    if (!retried && wait !== null && wait <= 8) {
      await new Promise((r) => setTimeout(r, (wait + 0.5) * 1000));
      return callModel<T>(model, system, input, schema, true);
    }
    throw new GeminiResting(`${model} quota reached`);
  }
  if (res.status === 503 || res.status === 500 || res.status === 504) throw new GeminiBusy(`${model} busy`);
  if (!res.ok) throw new GeminiError(`Gemini ${res.status}`);

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new GeminiError("Gemini sent no answer");
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new GeminiError("Gemini's answer wasn't valid JSON");
  }
}

async function retryDelaySeconds(res: Response): Promise<number | null> {
  try {
    const body = (await res.json()) as { error?: { details?: { retryDelay?: string }[] } };
    const d = body.error?.details?.find((x) => typeof x.retryDelay === "string")?.retryDelay;
    const n = d ? parseFloat(d) : NaN;
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}
