import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, userState, type Favorite } from "@/db/schema";
import { decrypt } from "@/lib/crypto";
import { answerCallbackQuery, sendMessage, type TelegramUpdate } from "@/lib/telegram";
import { addToBlacklist, addToFavorites, removeFromFavorites } from "@/lib/state";

export const runtime = "nodejs";

function secretsMatch(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;

  // Always respond 200 quickly once we've done our best, even on internal
  // errors, so Telegram doesn't retry-storm the same update.
  try {
    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!user || !user.isActive) {
      return new NextResponse("OK", { status: 200 });
    }

    const headerSecret = req.headers.get("x-telegram-bot-api-secret-token") ?? "";
    if (!secretsMatch(headerSecret, user.webhookSecret)) {
      return new NextResponse("OK", { status: 200 });
    }

    const update = (await req.json()) as TelegramUpdate;
    const cq = update.callback_query;
    if (!cq) {
      return new NextResponse("OK", { status: 200 });
    }

    const data = cq.data ?? "";
    const colonIdx = data.indexOf(":");
    const action = colonIdx > -1 ? data.slice(0, colonIdx) : null;
    const propertyId = colonIdx > -1 ? data.slice(colonIdx + 1) : null;

    if (!action || !propertyId || (action !== "y" && action !== "n")) {
      return new NextResponse("OK", { status: 200 });
    }

    const botToken = decrypt(user.telegramBotToken);
    const state = await db.query.userState.findFirst({ where: eq(userState.userId, user.id) });
    const blacklistedIds = (state?.blacklistedIds as string[]) ?? [];
    const favorites = (state?.favorites as Favorite[]) ?? [];

    let confirmationText: string;
    let nextBlacklist = blacklistedIds;
    let nextFavorites = favorites;

    if (action === "n") {
      nextBlacklist = addToBlacklist(blacklistedIds, propertyId);
      nextFavorites = removeFromFavorites(favorites, propertyId);
      confirmationText = "❌ Aggiunto alla lista nera. Non riceverai più notifiche per questo annuncio.";
    } else {
      const titleMatch = cq.message?.text?.match(/\*(.+?)\*/);
      nextFavorites = addToFavorites(favorites, {
        id: propertyId,
        title: titleMatch ? titleMatch[1] : null,
        ts: new Date().toISOString(),
      });
      confirmationText = "✅ Salvato nei preferiti!";
    }

    await db
      .insert(userState)
      .values({ userId: user.id, blacklistedIds: nextBlacklist, favorites: nextFavorites })
      .onConflictDoUpdate({
        target: userState.userId,
        set: { blacklistedIds: nextBlacklist, favorites: nextFavorites, updatedAt: new Date() },
      });

    await answerCallbackQuery(botToken, cq.id, confirmationText);
    await sendMessage(
      botToken,
      user.telegramChatId,
      `${confirmationText}\n\n_Preferiti: ${nextFavorites.length} | Lista nera: ${nextBlacklist.length}_`
    );

    return new NextResponse("OK", { status: 200 });
  } catch (err) {
    console.error(`Webhook error for user ${userId}:`, err);
    return new NextResponse("OK", { status: 200 });
  }
}
