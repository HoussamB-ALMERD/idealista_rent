import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  bigint,
  integer,
  jsonb,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),

  // Friendly label only — shown in confirmation messages, never sent to the Telegram API.
  displayName: text("display_name"),

  // Encrypted at rest (see lib/crypto.ts). AES-GCM uses a random IV per encryption,
  // so the ciphertext is NOT stable across re-submissions of the same plaintext token
  // and can't be used for lookups/uniqueness directly.
  telegramBotToken: text("telegram_bot_token").notNull(),
  // Deterministic SHA-256 of the plaintext token (see lib/crypto.ts hashToken()).
  // Unique so re-submitting the same bot's token in the signup form updates the
  // existing row (matched via this hash) instead of creating a duplicate.
  telegramBotTokenHash: text("telegram_bot_token_hash").notNull().unique(),
  telegramChatId: bigint("telegram_chat_id", { mode: "number" }).notNull(),

  // Random hex secret, sent to Telegram via setWebhook's secret_token and checked
  // against the X-Telegram-Bot-Api-Secret-Token header on every incoming webhook call.
  webhookSecret: text("webhook_secret").notNull().unique(),

  // Search filters, passed almost directly into the Apify actor input.
  location: text("location").notNull(),
  maxPrice: text("max_price").notNull(), // Apify expects one of its fixed enum strings, not an arbitrary number
  country: text("country").notNull().default("it"),
  operation: text("operation").notNull().default("rent"),
  bedrooms: text("bedrooms").array().notNull().default(["1", "2", "3"]),
  maxItems: integer("max_items").notNull().default(50),

  isActive: boolean("is_active").notNull().default(true),
  lastRunAt: timestamp("last_run_at", { withTimezone: true }),
  lastError: text("last_error"),
  lastErrorAt: timestamp("last_error_at", { withTimezone: true }),
});

export const userState = pgTable("user_state", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),

  // string[] of Idealista propertyCode
  blacklistedIds: jsonb("blacklisted_ids").notNull().default([]),
  // { id: string, title: string | null, ts: string }[]
  favorites: jsonb("favorites").notNull().default([]),
  // string[] of propertyCode already sent, capped to 500 entries
  lastRunIds: jsonb("last_run_ids").notNull().default([]),

  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UserState = typeof userState.$inferSelect;

export type Favorite = { id: string; title: string | null; ts: string };
