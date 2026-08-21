# Idealista Rental Alerts

A small multi-tenant web app: a friend fills in a city, max price, and their own
Telegram bot token, clicks Start, and their bot starts DMing them new Idealista.it
rental listings every 6 hours — with photos and ✅/❌/🔗 buttons, exactly like the
original single-user n8n workflow this replaces.

- **Web app** (Next.js on Vercel): the signup form (`/`) and the Telegram webhook
  that handles button clicks (`/api/telegram/webhook/[userId]`).
- **The 6h job** (`scripts/run-check.ts`): a plain Node script triggered by a free
  GitHub Actions cron workflow, *not* a Vercel Function — this sidesteps Vercel
  Hobby's 60s function timeout / once-daily cron limit entirely.
- **Database**: Postgres (Neon), storing per-friend config + per-friend dedupe
  state (blacklist, favorites, last-seen listing ids).

See `.claude/plans` in the parent Claude session, or ask for it again, for the
full design rationale. This file is the practical setup runbook.

## One-time setup

1. **Create a GitHub repo** and push this project to it (needed for GitHub
   Actions):
   ```
   git remote add origin <your-repo-url>
   git push -u origin main
   ```

2. **Log into Vercel** (`vercel login`) and link this project:
   ```
   vercel link
   ```

3. **Provision Postgres**: Vercel dashboard → your project → Storage →
   Marketplace → Neon → create a database. This auto-populates `DATABASE_URL`
   in your Vercel project's environment variables.

4. **Set the rest of the Vercel env vars** (Production *and* Preview):
   ```
   vercel env add APP_PASSCODE
   vercel env add PUBLIC_BASE_URL      # e.g. https://your-app.vercel.app
   vercel env add ENCRYPTION_KEY       # node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
   `PUBLIC_BASE_URL` must be your **stable** production domain — never rely on
   `VERCEL_URL`, since that changes per-deployment and would silently break
   every friend's already-registered Telegram webhook.

5. **Pull env vars locally** and run the migration against the real database:
   ```
   vercel env pull .env.local
   cp .env.local .env          # drizzle-kit and the local script read .env
   npm run db:migrate
   ```

6. **Set GitHub Actions secrets** (repo → Settings → Secrets and variables →
   Actions): `DATABASE_URL` (same Neon URL as Vercel), `ENCRYPTION_KEY` (same
   value as Vercel), and `APIFY_TOKEN` (your Apify account token — this one is
   only needed here, not in Vercel).

7. **Deploy**:
   ```
   vercel --prod
   ```

8. **Test the cron job once manually** before trusting the schedule: GitHub repo
   → Actions → "Check Idealista listings" → Run workflow.

## Cost / abuse note

Every friend's scrape runs against **your** Apify account (`APIFY_TOKEN`) — you
pay for all of it. Mitigations already in place: the passcode gate, a fixed
`maxItems=50` per search, a 20-listing send cap per person per run, and a soft
cap rejecting new signups once 20 people are active. Consider also setting a
spend alert in the Apify console.

## Local development

```
npm run dev              # the web app at localhost:3000
npm run check:local      # run the 6h job once, locally, against real Postgres/Telegram/Apify
npm run db:generate      # after changing db/schema.ts, generate a new migration
npm run db:migrate       # apply pending migrations
```

## ⚠️ Disk space

This machine's C: drive was at **~44MB free / 223GB used (100%)** when this
project was built. That's critical — likely to cause failed installs, failed
builds, or worse well beyond this project. Worth clearing space before doing
much more here.
