import type { RawListing } from "./apify";
import type { InlineKeyboard } from "./telegram";

export type Listing = {
  id: string;
  title: string;
  url: string;
  price: number;
  rooms: string | number;
  bathrooms: string | number;
  size: string | number;
  description: string;
  country: string;
  operation: string;
  images: string[]; // 0-2 URLs
};

type MultimediaImage = { url?: string };

// Ports the exact field-fallback chain proven in the n8n "Filter New Listings" node.
export function normalizeListing(
  raw: RawListing,
  fallbackCountry: string,
  fallbackOperation: string
): Listing {
  const l = raw as Record<string, unknown> & {
    price?: number;
    priceInfo?: { price?: { amount?: number } };
    title?: string;
    suggestedTexts?: { title?: string };
    country?: string;
    operation?: string;
    thumbnail?: string;
    multimedia?: { images?: MultimediaImage[] };
    propertyCode?: string;
    url?: string;
    rooms?: string | number;
    bathrooms?: string | number;
    size?: string | number;
    description?: string;
  };

  const priceAmount = l.price ?? l.priceInfo?.price?.amount ?? 0;
  const titleText = l.title ?? l.suggestedTexts?.title ?? "Appartamento";
  const country = l.country ?? fallbackCountry;
  const operation = l.operation ?? fallbackOperation;

  // Up to 2 photo URLs: the thumbnail plus the first distinct gallery image.
  const images: string[] = [];
  if (l.thumbnail) images.push(l.thumbnail);
  const gallery: MultimediaImage[] = Array.isArray(l.multimedia?.images) ? l.multimedia.images : [];
  for (const img of gallery) {
    if (img?.url && !images.includes(img.url)) images.push(img.url);
    if (images.length >= 2) break;
  }

  return {
    id: String(l.propertyCode ?? l.url ?? Math.random()),
    title: titleText,
    url: l.url ?? "",
    price: priceAmount,
    rooms: l.rooms ?? "?",
    bathrooms: l.bathrooms ?? "?",
    size: l.size ?? "?",
    description: String(l.description ?? "").slice(0, 150),
    country,
    operation,
    images,
  };
}

export function buildCaption(listing: Listing): string {
  const desc = listing.description
    ? listing.description.slice(0, 150) + (listing.description.length > 150 ? "…" : "")
    : "_No description available_";

  const priceStr = listing.price ? `€${listing.price}/mese` : "Prezzo non disponibile";
  const sizeStr = listing.size && listing.size !== "?" ? `${listing.size} m²` : "";

  return [
    `🏠 *${listing.title}*`,
    "",
    `💰 *Prezzo:* ${priceStr}`,
    `🛏 *Camere:* ${listing.rooms}   🚿 *Bagni:* ${listing.bathrooms}${sizeStr ? `   📐 ${sizeStr}` : ""}`,
    "",
    `📝 ${desc}`,
  ].join("\n");
}

// Telegram callback_data must be <= 64 bytes.
export function buildKeyboard(listing: Listing): InlineKeyboard {
  const shortId = listing.id.slice(0, 60);
  return {
    inline_keyboard: [
      [
        { text: "✅ Yes", callback_data: `y:${shortId}` },
        { text: "❌ No", callback_data: `n:${shortId}` },
        { text: "🔗 View", url: listing.url || "https://www.idealista.it" },
      ],
    ],
  };
}
