// Calls the igolaizola/idealista-scraper Apify actor and returns the raw dataset items.
// Actor id REcGj6dyoIJ9Z7aE6, aka igolaizola~idealista-scraper.
// NOTE: 'canadesk~idealista-scraper' does NOT exist on Apify (404) — do not use it.

export type ApifyInput = {
  country: string; // "it" | "es" | "pt"
  operation: string; // "rent" | "sale"
  propertyType: string; // e.g. "homes"
  location: string; // free-text city name
  maxPrice: string; // one of Apify's fixed enum strings, e.g. "1500"
  bedrooms: string[]; // e.g. ["1","2","3"] — enum values "studio","1".."4"
  maxItems: number;
};

// The actor's real dataset item shape is loosely typed here — we only read the
// fields we actually use, with fallbacks, in lib/listings.ts.
export type RawListing = Record<string, unknown>;

export async function runApifyScraper(input: ApifyInput): Promise<RawListing[]> {
  const token = process.env.APIFY_TOKEN;
  if (!token) throw new Error("APIFY_TOKEN is not set");

  const url =
    "https://api.apify.com/v2/acts/igolaizola~idealista-scraper/run-sync-get-dataset-items" +
    "?token=" +
    encodeURIComponent(token) +
    "&timeout=120&memory=256";

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const bodyText = await res.text().catch(() => "");
    throw new Error(`Apify request failed (${res.status}): ${bodyText.slice(0, 300)}`);
  }

  const body = await res.json();
  if (Array.isArray(body)) return body as RawListing[];

  // Defensive fallback in case the actor's response shape ever changes.
  if (body && Array.isArray((body as { items?: unknown }).items)) {
    return (body as { items: RawListing[] }).items;
  }

  console.warn("Unexpected Apify response shape:", JSON.stringify(body).slice(0, 200));
  return [];
}
