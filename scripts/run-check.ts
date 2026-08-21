import "dotenv/config";
import pLimit from "p-limit";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, userState } from "@/db/schema";
import { decrypt } from "@/lib/crypto";
import { runApifyScraper } from "@/lib/apify";
import { normalizeListing } from "@/lib/listings";
import { sendListing } from "@/lib/sendListing";
import { mergeLastRunIds } from "@/lib/state";

const CONCURRENCY = 3;
const MAX_SENDS_PER_RUN = 20;
const SEND_DELAY_MS = 350;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function processUser(user: typeof users.$inferSelect) {
  const botToken = decrypt(user.telegramBotToken);

  const items = await runApifyScraper({
    country: user.country,
    operation: user.operation,
    propertyType: "homes",
    location: user.location,
    maxPrice: user.maxPrice,
    bedrooms: user.bedrooms,
    maxItems: user.maxItems,
  });

  const normalized = items.map((raw) => normalizeListing(raw, user.country, user.operation));
  const italianRentals = normalized.filter((l) => l.country === "it" && l.operation === "rent");

  const state = await db.query.userState.findFirst({ where: eq(userState.userId, user.id) });
  const blacklistedIds = new Set((state?.blacklistedIds as string[]) ?? []);
  const lastRunIds = new Set((state?.lastRunIds as string[]) ?? []);

  const fresh = italianRentals.filter((l) => !blacklistedIds.has(l.id) && !lastRunIds.has(l.id));
  const toSend = fresh.slice(0, MAX_SENDS_PER_RUN);
  if (fresh.length > toSend.length) {
    console.warn(
      `[${user.id}] ${fresh.length} new listings found, capping this run's sends to ${MAX_SENDS_PER_RUN}`
    );
  }

  let sent = 0;
  for (const listing of toSend) {
    const result = await sendListing(botToken, user.telegramChatId, listing);
    if (result.ok) sent++;
    else console.warn(`[${user.id}] send failed for listing ${listing.id}: ${result.error}`);
    await sleep(SEND_DELAY_MS);
  }

  const newLastRunIds = mergeLastRunIds([...lastRunIds], fresh.map((l) => l.id));
  await db
    .insert(userState)
    .values({ userId: user.id, lastRunIds: newLastRunIds })
    .onConflictDoUpdate({
      target: userState.userId,
      set: { lastRunIds: newLastRunIds, updatedAt: new Date() },
    });

  await db
    .update(users)
    .set({ lastRunAt: new Date(), lastError: null, lastErrorAt: null })
    .where(eq(users.id, user.id));

  return { userId: user.id, found: italianRentals.length, fresh: fresh.length, sent };
}

async function main() {
  const activeUsers = await db.select().from(users).where(eq(users.isActive, true));
  console.log(`Found ${activeUsers.length} active user(s)`);

  const limit = pLimit(CONCURRENCY);
  let succeeded = 0;
  let failed = 0;

  await Promise.all(
    activeUsers.map((user) =>
      limit(async () => {
        try {
          const result = await processUser(user);
          console.log(
            `[${result.userId}] found=${result.found} fresh=${result.fresh} sent=${result.sent}`
          );
          succeeded++;
        } catch (err) {
          failed++;
          const message = err instanceof Error ? err.message : String(err);
          console.error(`[${user.id}] FAILED: ${message}`);
          await db
            .update(users)
            .set({ lastError: message.slice(0, 500), lastErrorAt: new Date() })
            .where(eq(users.id, user.id));
        }
      })
    )
  );

  console.log(`Done. processed=${activeUsers.length} succeeded=${succeeded} failed=${failed}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Fatal error in run-check:", err);
    process.exit(1);
  });
