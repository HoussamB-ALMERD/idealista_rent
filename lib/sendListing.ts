import { sendMessage, sendPhoto, type TelegramResult } from "./telegram";
import { buildCaption, buildKeyboard, type Listing } from "./listings";

// Telegram doesn't allow inline keyboards on sendMediaGroup (albums), so with 2
// photos we send the first with the caption+buttons, then a second plain photo
// right after. With 0 photos we fall back to a text-only message with buttons.
export async function sendListing(
  botToken: string,
  chatId: number,
  listing: Listing
): Promise<{ ok: boolean; error?: string }> {
  const caption = buildCaption(listing);
  const keyboard = buildKeyboard(listing);

  let primary: TelegramResult<unknown>;
  if (listing.images.length > 0) {
    primary = await sendPhoto(botToken, chatId, listing.images[0], caption, keyboard);
  } else {
    primary = await sendMessage(botToken, chatId, caption, keyboard);
  }

  if (!primary.ok) {
    return { ok: false, error: `${primary.error_code}: ${primary.description}` };
  }

  if (listing.images.length > 1) {
    const second = await sendPhoto(botToken, chatId, listing.images[1]);
    if (!second.ok) {
      // Non-fatal: the main message with buttons already went through.
      console.warn(`Second photo failed for listing ${listing.id}: ${second.description}`);
    }
  }

  return { ok: true };
}
