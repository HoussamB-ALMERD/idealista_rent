# Idealista Rental Alerts

Get new Italian rental listings from Idealista.it sent straight to your own
Telegram bot — no browsing, no refreshing, just a DM when something new
matches what you're looking for.

## How it works

1. **Sign up** on the web page: pick a city, a max monthly price, paste in the
   token of your own Telegram bot, and enter the passcode. Takes under a
   minute.
2. Every **6 hours**, the app checks Idealista for new rentals matching your
   city, price, and room count.
3. Anything new gets DMed to you by your bot: photos, price, size, rooms, a
   short description, and three buttons:
   - **✅ Yes** — save it to your favorites
   - **❌ No** — dismiss it, you won't see that listing again
   - **🔗 View** — open the full listing on Idealista.it
4. Already-seen and dismissed listings are remembered, so you only ever get
   notified about something new.

Everything happens inside Telegram — there's no dashboard to check, no app to
open. The web page is only used once, to set things up.

### Setting up your own Telegram bot

You need your *own* bot so the messages come from something that's yours:

1. Open a chat with [@BotFather](https://t.me/BotFather) on Telegram and send
   `/newbot`, follow the prompts, and copy the token it gives you.
2. Send your new bot any message (e.g. `/start`) so it knows who to talk to.
3. Paste that token into the signup form.

## Under the hood

- **Web app** (Next.js on Vercel): the signup form and the Telegram webhook
  that handles the ✅/❌ button clicks.
- **The 6-hour check** (`scripts/run-check.ts`): runs on a free GitHub Actions
  schedule rather than as a Vercel function, so it isn't limited by Vercel's
  free-tier function timeout.
- **Database** (Postgres/Neon): stores each person's search settings and
  which listings they've already seen, favorited, or dismissed — independent
  per person.
- Ported from an earlier single-user n8n workflow that proved the Apify +
  Telegram logic out first.

For deployment/setup instructions, see [`SETUP.md`](./SETUP.md).

## Cost note

Every search runs against one shared Apify account, so the owner pays for
everyone's usage. There's a passcode gate and a cap on how many people can be
active at once to keep that in check.
