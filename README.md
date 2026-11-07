# Talk

**A free read-aloud website.** Paste some text or drop in a text-only PDF (up to 20,000 words), pick a voice, and Talk reads it out loud. The line being read lights up and stays centred, like song lyrics on Spotify.

No sign-up. Audio plays on the site only: no downloads, and nothing is stored.

**Live at [t-alk.vercel.app](https://t-alk.vercel.app).**

## Voices

There are two kinds of voice option.

**Languages** translate your text first, then read the translation:

- Nigerian Pidgin
- Spanish
- French

**Accents** keep your text exactly as you wrote it and only change the voice:

- Nigerian
- British
- Spanish
- French
- German

When you pick a language, Talk works out which language your text is in by itself. If your text is already in the language you picked, Talk skips the translation and reads it as it is. Mixed texts are translated line by line: lines already in the chosen language are left exactly as written.

Language options aren't available to visitors in the EU/EEA, the UK or Switzerland, because Google's free Gemini tier can't be offered there. Accents work everywhere.

## How playback works

- The text is split into lines (sentences).
- Audio is made one line at a time, a few lines ahead of where you are. Talk never makes audio for the whole text at once, so reading starts quickly.
- The current line is highlighted. When the voice reports word timings, the current word is highlighted too.
- Tap any line to jump to it. Controls: play/pause, back one line, skip one line, and speed from 0.75× to 1.5×.
- For translated reads you can switch between the translation and your original text.
- Keyboard: Space or K plays and pauses; the left and right arrow keys move between lines.

If a voice is busy or down, Talk moves to the next voice in that option's list automatically and shows a short note:

| Option | Tried in this order |
| --- | --- |
| Nigerian Pidgin | Microsoft Edge Nigerian English → YarnGPT → Kokoro English (in your browser) |
| Spanish, French (languages) | Microsoft Edge voice in that language |
| British accent | Microsoft Edge British → Kokoro British (in your browser) |
| Nigerian accent | Microsoft Edge Nigerian English → YarnGPT |
| Spanish, French, German accents | Microsoft Edge voice in that language |

## Privacy

- No accounts and no sign-up.
- Your text and the audio are **never stored**.
- To read your text aloud, Talk sends it to the services that do the work: Microsoft Edge's voice service and YarnGPT (voices). Kokoro runs in your own browser.
- Your text goes to Google Gemini **only when you pick a language** (Pidgin, Spanish or French): a short sample to check its language, then a batch of lines at a time to translate as you listen. On Gemini's free tier, Google may use what it receives to improve its products.
- To decide whether language options can be shown, Talk reads your country from its host's request header for that one request. It's never stored.
- Talk keeps a small anonymous log with one row per text read: the time, the option picked, the voice that was actually used, the word count, whether it was typed or a PDF, and the detected language. It never logs the text, the audio, names or IP addresses.
- The only number shown publicly is the total count of texts read.
- To keep things fair, each browser can start 10 new texts an hour. For that, the browser makes a random ID for itself, which is scrambled before it's stored and deleted after an hour. A fingerprint of each text is made in your browser, and never leaves it, so replaying the same text doesn't count again.

## Built with

- [Next.js](https://nextjs.org) and TypeScript, plain CSS
- [pdf.js](https://mozilla.github.io/pdf.js/) in the browser to read PDF text
- [Google Gemini API](https://ai.google.dev) for language detection and translation
- [YarnGPT](https://yarngpt.ai) for the Pidgin voice
- Microsoft Edge voices (via a Node.js port of [edge-tts](https://github.com/rany2/edge-tts)), with word timings
- [Kokoro](https://github.com/hexgrad/kokoro) (kokoro-js) as the in-browser backup voice
- [Supabase](https://supabase.com) for the anonymous play log, the public counter and rate limits
- Hosted on [Vercel](https://vercel.com)

## Running it on your own computer

You need [Node.js](https://nodejs.org) 20 or newer.

```bash
npm install
cp .env.example .env.local   # then fill in your own keys
npm run dev
```

Then open http://localhost:3000.

Every key lives in `.env.local`, which git ignores, or in Vercel's environment settings. All calls to Gemini, YarnGPT, the Edge voices and Supabase go through server functions, so no key ever reaches the browser. See [`.env.example`](.env.example) for the list.

### Database

Run [`supabase/schema.sql`](supabase/schema.sql) once in your Supabase project (SQL Editor → New query → Run). It creates the play log and the hourly-limit table, turns on row-level security with no public access, and adds `plays_total()` as the only thing the public can read.

### Voice test page

`/test` plays the same paragraph (or a names test full of Nigerian names, places and food) through every voice. It's locked with `TEST_PAGE_PASSWORD` and doesn't exist when that's not set.

### Testing failures locally

These only work in development (`npm run dev`), never on the live site:

| Setting | What it does |
| --- | --- |
| `TALK_SIMULATE_DOWN=edge` | Edge voices fail, so backups take over (`edge@3` fails after 3 lines) |
| `TALK_SIMULATE_DOWN=yarngpt-resting` | YarnGPT acts as if its daily limit is used up |
| `TALK_SIMULATE_DOWN=gemini` | Translation acts as if it's resting |
| `TALK_SIMULATE_DOWN=network@3` | The connection "drops" after 3 lines |
| `TALK_SIMULATE_DELAY_MS=5000` | Every voice line is that much slower |
| `TALK_SIMULATE_COUNTRY=GB` | Pretend to be a visitor from that country |

## Licence

[MIT](LICENSE). The design uses the Plus Jakarta Sans font, which is under the SIL Open Font License.
