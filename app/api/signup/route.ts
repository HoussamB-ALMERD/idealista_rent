import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "crypto";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, userState } from "@/db/schema";
import { verifyPasscode } from "@/lib/passcode";
import { encrypt, hashToken } from "@/lib/crypto";
import { getMe, resolveChatIdFromUpdates, setWebhook, sendMessage } from "@/lib/telegram";

export const runtime = "nodejs";

const MAX_ACTIVE_USERS = 20;

const SignupSchema = z.object({
  displayName: z.string().trim().max(80).optional().or(z.literal("")),
  location: z.string().trim().min(2).max(80),
  maxPrice: z.string().trim().min(1),
  telegramBotToken: z.string().trim().regex(/^\d+:[\w-]{30,}$/, "That doesn't look like a Telegram bot token"),
  passcode: z.string().min(1),
});

export async function POST(req: NextRequest) {
  let payload: z.infer<typeof SignupSchema>;
  try {
    payload = SignupSchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: "invalid_input", message: err instanceof z.ZodError ? err.issues[0]?.message : "Invalid input" },
      { status: 400 }
    );
  }

  if (!verifyPasscode(payload.passcode)) {
    return NextResponse.json({ error: "invalid_passcode", message: "Incorrect passcode" }, { status: 401 });
  }

  const { telegramBotToken, location, maxPrice, displayName } = payload;

  // 1. Confirm the token is a real bot.
  const me = await getMe(telegramBotToken);
  if (!me.ok) {
    return NextResponse.json(
      { error: "invalid_bot_token", message: "Telegram rejected that bot token — double check it and try again." },
      { status: 400 }
    );
  }

  // 2. Resolve chat_id from the friend having messaged their bot at least once.
  const chatId = await resolveChatIdFromUpdates(telegramBotToken);
  if (chatId === null) {
    return NextResponse.json(
      {
        error: "no_chat_found",
        message:
          "Open Telegram, message your bot (e.g. send /start), then click Start again. We couldn't find a message from you to this bot yet.",
      },
      { status: 422 }
    );
  }

  // 3. Soft cap on brand-new signups (existing users can still update their settings).
  const tokenHash = hashToken(telegramBotToken);
  const existing = await db.query.users.findFirst({ where: eq(users.telegramBotTokenHash, tokenHash) });

  if (!existing) {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.isActive, true));
    if (Number(count) >= MAX_ACTIVE_USERS) {
      return NextResponse.json(
        { error: "at_capacity", message: "We're at capacity right now — ping the owner to get added." },
        { status: 429 }
      );
    }
  }

  const webhookSecret = existing?.webhookSecret ?? randomBytes(32).toString("hex");
  const encryptedToken = encrypt(telegramBotToken);

  const row = {
    displayName: displayName || null,
    telegramBotToken: encryptedToken,
    telegramBotTokenHash: tokenHash,
    telegramChatId: chatId,
    webhookSecret,
    location,
    maxPrice,
    isActive: true,
    lastError: null,
    lastErrorAt: null,
  };

  const [user] = existing
    ? await db.update(users).set(row).where(eq(users.id, existing.id)).returning()
    : await db.insert(users).values(row).returning();

  if (!existing) {
    await db.insert(userState).values({ userId: user.id }).onConflictDoNothing();
  }

  // 4. Point Telegram's webhook at this user's dedicated callback URL.
  const baseUrl = process.env.PUBLIC_BASE_URL;
  if (!baseUrl) {
    return NextResponse.json({ error: "server_misconfigured", message: "PUBLIC_BASE_URL is not set" }, { status: 500 });
  }

  const webhookUrl = `${baseUrl}/api/telegram/webhook/${user.id}`;
  const webhookRes = await setWebhook(telegramBotToken, webhookUrl, webhookSecret);
  if (!webhookRes.ok) {
    await db.update(users).set({ isActive: false }).where(eq(users.id, user.id));
    return NextResponse.json(
      { error: "webhook_registration_failed", message: "Couldn't register the Telegram webhook. Try again." },
      { status: 502 }
    );
  }

  // 5. Confirmation DM so the friend knows it worked without leaving Telegram.
  const label = displayName ? `${displayName} is` : "You're";
  await sendMessage(
    telegramBotToken,
    chatId,
    `✅ ${label} all set! Watching *${location}* for rentals up to €${maxPrice}, checked every 6 hours.`
  );

  return NextResponse.json({ ok: true });
}
