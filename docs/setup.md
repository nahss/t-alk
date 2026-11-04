# Setting up Talk's accounts and keys

This guide covers the four services Talk needs. Each part takes about 5 minutes. All four are free, and **you never need to add a credit card**. If any site asks for payment details, stop and tell Claude.

**Golden rule:** a key is like a password. Paste keys only into `.env.local` on your computer (Part 4) and into Vercel (Part 5). Never paste them into the chat, an email, a screenshot or a GitHub file.

As you go, keep the keys in a temporary note. Delete the note once Part 5 is done.

---

## Part 1: Google Gemini key (language detection + translation)

1. Go to **https://aistudio.google.com** and sign in with a Google account.
2. If it shows terms of service, read them and accept if you're happy to.
3. Click **Get API key**. It's in the left sidebar, or at the bottom left on some screens.
4. Click **Create API key**. If it asks which Google Cloud project to use, pick the one it suggests or choose **Create in new project**.
5. Copy the key. It starts with `AIza`. Put it in your note, labelled **GEMINI_API_KEY**.
6. Don't click anything about billing or upgrading. Talk uses the free tier.

> Worth knowing: on the free tier, Google's terms say it may use the text it receives to improve its products, and that human reviewers may read it. Google also asks developers not to send sensitive or personal information.

## Part 2: YarnGPT key (Pidgin voice)

1. Go to **https://yarngpt.ai** and sign up.
2. After signing in, open your account or dashboard menu and look for **API** or **API keys**.
3. Create a key and copy it. Put it in your note, labelled **YARNGPT_API_KEY**.
4. **Check the dashboard for credits:** does a free account come with credits or a daily allowance, and how much? Tell Claude what it says. You don't need to share the key itself.

## Part 3: Supabase (play log, public counter, rate limits)

1. Go to **https://supabase.com** and click **Start your project**. Choose **Continue with GitHub**, the simplest option, and allow access.
2. If it asks you to create an organisation, give it any name and choose the **Free** plan.
3. Click **New project** and fill in:
   - **Name:** `talk`
   - **Database password:** click **Generate a password**, then save it in your password manager. Talk won't need it, but keep it safe.
   - **Region:** **East US (North Virginia)**. Vercel's servers run there by default, so this keeps them close together.
4. Click **Create new project** and wait 1–2 minutes while it sets up.
5. **Project URL:** click the **Connect** button at the top of the project page. Copy the URL that looks like `https://abcdefgh.supabase.co`. Put it in your note, labelled **SUPABASE_URL**.
6. **Secret key:** in the left sidebar, click the **gear icon (Project Settings)**, then **API Keys**.
   - Find the **Secret keys** section. If there's no key yet, click **Add new secret key** and name it `vercel`.
   - Copy the secret key. It starts with `sb_secret_`. Put it in your note, labelled **SUPABASE_SECRET_KEY**.
   - Skip the "publishable" key. Talk doesn't need it.

> This secret key gives full access to your database, so it only ever lives on the server. Claude will set up the database's safety rules (row-level security) in Phase 6.

## Part 4: Put the keys on your computer

1. Open the key file in TextEdit. You can click **Run** on this command in Claude's reply, or paste it into Terminal:

   ```bash
   open -e /Users/user/Downloads/T-alk/.env.local
   ```

2. You'll see four lines ending in `=`. Paste each key straight after its `=`, with **no spaces and no quote marks**. For example:

   ```
   GEMINI_API_KEY=AIzaSy...your key...
   ```

3. Save with **Cmd + S** and close TextEdit.
4. Tell Claude **"keys are in"**. Claude will check that each line has a value, without showing the values.

## Part 5: Connect Vercel (hosting)

1. Go to **https://vercel.com/signup**.
   - Choose **Hobby**. This plan is for personal, non-commercial projects. Talk is free with no ads, so it fits.
   - Click **Continue with GitHub** and allow access.
2. On your Vercel dashboard, click **Add New…** and then **Project**.
3. Under **Import Git Repository**, find **t-alk** and click **Import**.
   - If t-alk isn't listed, click **Adjust GitHub App Permissions**, allow access to the **t-alk** repository, and go back.
4. On the **Configure Project** screen:
   - **Framework Preset** should already say **Next.js**. Leave the build settings alone.
   - Open **Environment Variables**. Add these four, using the same names and values as in `.env.local`:
     `GEMINI_API_KEY`, `YARNGPT_API_KEY`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY`
   - Shortcut: copy everything in your `.env.local` file and paste it into the first **Key** box. Vercel usually splits it into separate rows for you. If it doesn't, add them one at a time.
5. Click **Deploy** and wait about a minute.
6. When it finishes, you'll see a page that just says **"Talk"**. That's expected for now. Copy the site link (something like `t-alk.vercel.app`) and send it to Claude.

From now on, every time Claude pushes changes to GitHub, Vercel updates the live site automatically.

---

## What to send Claude when you're done

1. "Keys are in" (once Part 4 is done)
2. What the YarnGPT dashboard says about free credits or limits
3. Your Vercel link
