# Project Documentation

Full reference for how this system is built, deployed, and operated. See
[`README.md`](./README.md) for the friendly "what it does" pitch and
[`SETUP.md`](./SETUP.md) for step-by-step deploy instructions from scratch.
This file is the "everything we know about this project" reference.

## What this is

A multi-tenant rewrite of an earlier single-user n8n workflow. Originally,
one person (the repo owner) had an n8n workflow that scraped Idealista.it for
Salerno rentals every 6h and DMed new listings to their own Telegram bot with
Yes/No/View buttons. This project turns that into a self-serve web app so
other people can sign up with their own city, price range, and Telegram bot
— no n8n, no JSON editing, no manual `chat_id` lookup.

The n8n workflow (`Idealista Salerno Monitor v2.json`) still exists as the
original prototype but is superseded by this app for anyone using it going
forward.

## Live deployment

- **App**: https://idealista-alerts.vercel.app
- **GitHub repo**: https://github.com/HoussamB-ALMERD/idealista_rent (public)
- **Vercel project**: `idealista-alerts` under the `bouardihoussamcontact-4665` account
- **Database**: Neon Postgres, provisioned via the Vercel Marketplace integration
- **Passcode**: stored only as the `APP_PASSCODE` env var in Vercel — not
  written here since this repo is public. Check the Vercel dashboard
  (Project → Settings → Environment Variables) or ask whoever set it up.

## Architecture

```
Friend's browser
      │
      ▼
┌─────────────────────────┐      ┌────────────────────┐
│  Next.js app (Vercel)   │      │  Neon Postgres      │
│  ─ /            signup  │◄────►│  users              │
│  ─ /api/signup          │      │  user_state          │
│  ─ /api/telegram/       │      └────────────────────┘
│    webhook/[userId]     │               ▲
└─────────────────────────┘               │
      │ setWebhook                        │ reads/writes
      ▼                                   │
┌─────────────────────────┐               │
│  Telegram Bot API        │              │
│  (one bot per friend)    │              │
└─────────────────────────┘               │
      ▲ sendPhoto/sendMessage             │
      │ answerCallbackQuery               │
      │                                   │
┌─────────────────────────┐               │
│  scripts/run-check.ts    │───────────────┘
│  (GitHub Actions, 6h)    │
│  ─ loops every active    │
│    user, calls Apify,    │
│    sends new listings    │
└─────────────────────────┘
      │
      ▼
┌─────────────────────────┐
│  Apify actor              │
│  igolaizola/idealista-   │
│  scraper (id REcGj6dy...) │
└─────────────────────────┘
```

**Why the 6h job is a GitHub Actions script, not a Vercel Cron function**:
Vercel's free Hobby tier caps function execution at 60s and native Cron to
once/day. A single Apify call can take up to ~110s. Rather than pay for
Vercel Pro, `scripts/run-check.ts` runs as a plain Node script on a free
GitHub Actions schedule (`.github/workflows/check-listings.yml`), which has
no such limits. Vercel only hosts the fast request/response parts: the
signup form and the Telegram webhook.

## End-to-end flow

### Signup (`app/api/signup/route.ts`)
1. Friend fills in city, max price, their bot's token, display name (optional), passcode.
2. Server validates the passcode (`lib/passcode.ts`, timing-safe compare).
3. Calls Telegram `getMe` to confirm the token is real.
4. Calls Telegram `getUpdates` to find the friend's `chat_id` — this is why
   the form instructs "message your bot once before clicking Start." No
   manual chat-id hunting required.
5. Enforces a soft cap (20 active users) so signups can't run away with the
   owner's shared Apify budget.
6. Upserts a `users` row (matched by a SHA-256 hash of the bot token, since
   the token itself is stored encrypted and therefore not directly
   look-up-able — see `lib/crypto.ts`).
7. Calls Telegram `setWebhook`, pointing it at
   `${PUBLIC_BASE_URL}/api/telegram/webhook/<userId>`, with a random
   per-user `secret_token`.
8. Sends a confirmation DM through the friend's own bot.

### The 6h job (`scripts/run-check.ts`)
1. Loads every `users` row where `is_active = true`.
2. For each (bounded concurrency, 3 at a time, one user's failure never
   blocks another's — see `lib/state.ts` / try-catch per user):
   - Builds the Apify actor input from that user's `location`/`maxPrice`/`bedrooms`.
   - Calls the actor via `run-sync-get-dataset-items` (`lib/apify.ts`).
   - Normalizes each raw item (`lib/listings.ts`) — this ports the exact
     field-fallback chain proven in the original n8n workflow: `title ??
     suggestedTexts.title`, `price ?? priceInfo.price.amount`, up to 2 photo
     URLs from `thumbnail` + `multimedia.images`.
   - Filters to `country === "it" && operation === "rent"`, excludes
     blacklisted and already-sent ids.
   - Sends each new listing (`lib/sendListing.ts`): photo + caption + Yes/No/View
     buttons via `sendPhoto`, a second plain photo if a 2nd image exists
     (Telegram doesn't allow buttons on `sendMediaGroup` albums, hence this
     two-step pattern instead of a real album), or a text-only `sendMessage`
     fallback if the listing has no photo at all.
   - Updates `user_state.last_run_ids` (capped to 500) and `users.last_run_at`.

### Button clicks (`app/api/telegram/webhook/[userId]/route.ts`)
1. Looks up the user by the `userId` in the URL path.
2. Verifies Telegram's `X-Telegram-Bot-Api-Secret-Token` header against that
   user's stored `webhook_secret` — this is what stops one friend's webhook
   URL (if guessed) from injecting fake button-click data for another
   friend.
3. Parses `callback_data` (`y:<propertyCode>` / `n:<propertyCode>`), updates
   `favorites` or `blacklisted_ids` in `user_state`, answers the callback
   (toast) and sends a confirmation message — same UX as the original n8n
   workflow.

## Data model

```sql
users (
  id, created_at, display_name,
  telegram_bot_token,        -- encrypted (AES-256-GCM)
  telegram_bot_token_hash,   -- SHA-256, UNIQUE, used for signup upsert lookups
  telegram_chat_id, webhook_secret,
  location, max_price, country, operation, bedrooms, max_items,
  is_active, last_run_at, last_error, last_error_at
)

user_state (
  user_id (PK, FK -> users),
  blacklisted_ids jsonb,   -- string[] of propertyCode
  favorites jsonb,         -- { id, title, ts }[]
  last_run_ids jsonb,      -- string[], capped to 500
  updated_at
)
```

## Environment variables (names only — see the actual dashboards for values)

| Variable | Lives in | Used by |
|---|---|---|
| `DATABASE_URL` | Vercel (auto, Neon integration) + GitHub Actions secret | `lib/db.ts`, `scripts/run-check.ts` |
| `ENCRYPTION_KEY` | Vercel + GitHub Actions secret | `lib/crypto.ts` (bot token encryption) |
| `APP_PASSCODE` | Vercel only | `lib/passcode.ts` (signup gate) |
| `PUBLIC_BASE_URL` | Vercel only | `app/api/signup/route.ts` (webhook URL) |
| `APIFY_TOKEN` | GitHub Actions secret only | `lib/apify.ts` |

To rotate any of these: Vercel dashboard → Project → Settings → Environment
Variables, or GitHub repo → Settings → Secrets and variables → Actions.
Changing a Vercel env var requires a redeploy (`vercel --prod`) to take
effect.

## Cost & legal notes

- Every friend's Apify usage runs against **the owner's single Apify
  account** — the owner pays for all of it. Mitigated by: the passcode
  gate, `maxItems=50` per search, a ~20-listing send cap per person per run,
  and the 20-active-user signup cap.
- This scrapes Idealista.it without their explicit permission, which is
  almost certainly against their Terms of Service — a civil/contractual
  matter, not a criminal one, and low-risk in practice at this scale
  (non-commercial, low volume, results never published or resold, private
  DMs only). GDPR's household-activity exemption (Art. 2(2)(c)) covers
  personal-use tools like this one; that reasoning would need revisiting if
  this ever became public-facing or commercial. Not legal advice — just the
  risk assessment this project was built under.

## Known quirks / things that bit us while building this

Kept here so future debugging doesn't waste time rediscovering these:

- **The Apify actor is `igolaizola~idealista-scraper`**, not
  `canadesk~idealista-scraper` (that actor doesn't exist — 404). Its real
  input schema uses `location` (free text) and `bedrooms` (array of exact
  values `"studio"|"1"|"2"|"3"|"4"`, not a min/max range) and `maxPrice` as
  a **string** from a fixed enum, not an arbitrary number.
- **n8n's HTTP Request node splits a JSON array response into one output
  item per element** — this bit the original n8n workflow (`$input.first()`
  vs `$input.all()`). Not relevant to this Next.js app, but relevant if the
  old n8n workflow is ever touched again.
- **n8n's Split In Batches node**: output index 0 is "done", index 1 is
  "loop" — commonly wired backwards. Also n8n-workflow-specific, not this app.
- **AES-GCM encryption uses a random IV per call**, so encrypting the same
  plaintext token twice produces different ciphertext. The `users` table
  therefore has a separate deterministic `telegram_bot_token_hash` (SHA-256)
  column for the signup upsert-by-token lookup — the encrypted column alone
  can't be used for that.
- **Vercel CLI (`vercel env add ... preview`) has a bug/quirk** in this
  environment where it kept reporting "git_branch_required" and suggesting
  the exact command already being run, in a loop. Preview environment vars
  were skipped as a result — not an issue in practice since real usage only
  hits Production, but worth knowing if Preview deployments ever need testing.
- **Sensitive Vercel env vars (`--sensitive`) cannot target the Development
  environment** — add those as non-sensitive for `development`, sensitive
  for `production`/`preview`.
- **`npm ci` failed on GitHub Actions (Linux) even though local Windows
  installs worked** — the committed `package-lock.json` was missing a
  nested nested `@emnapi/*` nested optional-dependency entry at the version
  Linux's resolution needed, left over from an incremental
  `npm install pkg1 pkg2` history. Fixed with a full `rm -rf node_modules
  package-lock.json && npm install`. If this recurs, that's the fix.
- **GitHub fine-grained PATs need an explicit "Workflows" permission**
  (separate from "Contents") to push changes to any `.github/workflows/*`
  file — a plain Contents-only token gets rejected.
- **GitHub Actions "Re-run"** replays the run's original commit; it does
  **not** pick up new pushes. Use the workflow's own "Run workflow" button
  (Actions tab → workflow name → Run workflow ▾) to test against latest `main`.
- This machine was critically low on disk space (down to ~44MB free at one
  point) during development — if builds/installs ever fail mysteriously,
  check `df -h` before debugging anything else.

## Possible future work

- Expose `country`/`bedrooms`/`schedule` as signup form fields (schema
  already supports per-user values, just not surfaced in the UI yet).
- A lightweight dashboard for friends to see/edit their own settings or
  favorites without going through Telegram (currently out of scope by design).
- Per-user Apify accounts/tokens, if the shared-cost model stops scaling.
- Rate-limiting the passcode check (currently a passcode-only gate with no
  attempt throttling).
