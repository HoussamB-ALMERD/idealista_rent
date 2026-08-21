# Setup / Deployment Runbook

Technical steps to get this running from scratch. See [`README.md`](./README.md)
for what the app actually does.

## One-time setup

1. **Log into Vercel** and link this project:
   ```
   vercel login
   vercel link
   ```

2. **Provision Postgres**: Vercel dashboard → your project → Storage →
   Marketplace → Neon → create a database. This auto-populates `DATABASE_URL`
   in your Vercel project's environment variables.

3. **Set the rest of the Vercel env vars** (Production *and* Preview):
   ```
   vercel env add APP_PASSCODE
   vercel env add PUBLIC_BASE_URL      # e.g. https://your-app.vercel.app
   vercel env add ENCRYPTION_KEY       # node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
   `PUBLIC_BASE_URL` must be your **stable** production domain — never rely on
   `VERCEL_URL`, since that changes per-deployment and would silently break
   every friend's already-registered Telegram webhook.

4. **Pull env vars locally** and run the migration against the real database:
   ```
   vercel env pull .env.local
   cp .env.local .env          # drizzle-kit and the local script read .env
   npm run db:migrate
   ```

5. **Set GitHub Actions secrets** (repo → Settings → Secrets and variables →
   Actions): `DATABASE_URL` (same Neon URL as Vercel), `ENCRYPTION_KEY` (same
   value as Vercel), and `APIFY_TOKEN` (your Apify account token — this one is
   only needed here, not in Vercel).

6. **Deploy**:
   ```
   vercel --prod
   ```

7. **Test the cron job once manually** before trusting the schedule: GitHub repo
   → Actions → "Check Idealista listings" → Run workflow.

## Local development

```
npm run dev              # the web app at localhost:3000
npm run check:local      # run the 6h job once, locally, against real Postgres/Telegram/Apify
npm run db:generate      # after changing db/schema.ts, generate a new migration
npm run db:migrate       # apply pending migrations
```

Note: this repo was built on a machine that was nearly out of disk space at
the time (single digits of MB free at one point). If installs or builds start
failing mysteriously on a given machine, check `df -h` / free disk space
first before debugging anything else.
