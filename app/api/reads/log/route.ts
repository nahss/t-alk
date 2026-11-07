// Records one anonymous row for a text read: time, option, voice engine actually
// used, word count, typed or PDF, detected language. Never the text itself.
import { fromOurSite, json } from "@/lib/server/request";
import { readTicket, rpc } from "@/lib/server/supabase";
import { OPTIONS } from "@/lib/options";

const OPTION_IDS = new Set(OPTIONS.map((o) => o.id));
const ENGINES = new Set(["edge", "yarngpt", "kokoro"]);

export async function POST(request: Request) {
  if (!fromOurSite(request)) return json({ error: "Not allowed" }, 403);
  const b = await request.json().catch(() => null);
  const readId = typeof b?.ticket === "string" ? readTicket(b.ticket) : null;
  const words = Number(b?.words);
  const lang = b?.lang == null ? null : String(b.lang).toLowerCase();
  if (
    readId == null ||
    !OPTION_IDS.has(b?.option) ||
    !ENGINES.has(b?.engine) ||
    !Number.isInteger(words) ||
    words < 0 ||
    words > 20000 ||
    (b?.input !== "text" && b?.input !== "pdf") ||
    (lang !== null && !/^[a-z]{2,3}(-[a-z0-9]{2,8})?$/.test(lang))
  ) {
    return json({ ok: false }, 400);
  }

  try {
    const ok = await rpc<boolean>("log_play", {
      p_read_id: readId,
      p_option: b.option,
      p_engine: b.engine,
      p_words: words,
      p_input: b.input,
      p_lang: lang,
    });
    return json({ ok });
  } catch {
    return json({ ok: false });
  }
}
