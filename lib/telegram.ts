// Thin wrapper around the Telegram Bot API. Uses global fetch (Node 18+/Next.js runtime).

const API_ROOT = "https://api.telegram.org";

export type TelegramResult<T> =
  | { ok: true; result: T }
  | { ok: false; error_code: number; description: string };

async function call<T>(botToken: string, method: string, body?: unknown): Promise<TelegramResult<T>> {
  const res = await fetch(`${API_ROOT}/bot${botToken}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const json = (await res.json()) as TelegramResult<T>;
  return json;
}

export type TelegramUser = { id: number; is_bot: boolean; first_name: string; username?: string };

export function getMe(botToken: string) {
  return call<TelegramUser>(botToken, "getMe");
}

export type TelegramChat = { id: number; type: string };
export type TelegramMessage = { message_id: number; chat: TelegramChat; text?: string };
export type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: {
    id: string;
    data?: string;
    message?: TelegramMessage;
  };
};

export function getUpdates(botToken: string) {
  return call<TelegramUpdate[]>(botToken, "getUpdates", { limit: 100, timeout: 0 });
}

// Finds the chat_id of the most recent private-chat message sent TO the bot,
// so a friend just has to message their new bot once before signup can finish.
export async function resolveChatIdFromUpdates(botToken: string): Promise<number | null> {
  const res = await getUpdates(botToken);
  if (!res.ok) return null;

  const privateMessages = res.result
    .map((u) => u.message)
    .filter((m): m is TelegramMessage => !!m && m.chat.type === "private");

  if (privateMessages.length === 0) return null;
  return privateMessages[privateMessages.length - 1].chat.id;
}

export function setWebhook(botToken: string, url: string, secretToken: string) {
  return call<boolean>(botToken, "setWebhook", {
    url,
    secret_token: secretToken,
    allowed_updates: ["message", "callback_query"],
  });
}

export function getWebhookInfo(botToken: string) {
  return call<{ url: string; last_error_message?: string }>(botToken, "getWebhookInfo");
}

export type InlineKeyboard = {
  inline_keyboard: { text: string; callback_data?: string; url?: string }[][];
};

export function sendMessage(
  botToken: string,
  chatId: number,
  text: string,
  replyMarkup?: InlineKeyboard
) {
  return call(botToken, "sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "Markdown",
    reply_markup: replyMarkup,
  });
}

export function sendPhoto(
  botToken: string,
  chatId: number,
  photoUrl: string,
  caption?: string,
  replyMarkup?: InlineKeyboard
) {
  return call(botToken, "sendPhoto", {
    chat_id: chatId,
    photo: photoUrl,
    caption,
    parse_mode: caption ? "Markdown" : undefined,
    reply_markup: replyMarkup,
  });
}

export function answerCallbackQuery(botToken: string, callbackQueryId: string, text: string) {
  return call(botToken, "answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text,
    show_alert: false,
  });
}
