import type { Favorite } from "@/db/schema";

const MAX_LAST_RUN_IDS = 500;

export function capIds(ids: string[], max = MAX_LAST_RUN_IDS): string[] {
  const deduped = Array.from(new Set(ids));
  return deduped.slice(-max);
}

export function mergeLastRunIds(existing: string[], newIds: string[]): string[] {
  return capIds([...existing, ...newIds]);
}

export function addToBlacklist(existing: string[], id: string): string[] {
  if (existing.includes(id)) return existing;
  return [...existing, id];
}

export function removeFromFavorites(existing: Favorite[], id: string): Favorite[] {
  return existing.filter((f) => f.id !== id);
}

export function addToFavorites(existing: Favorite[], favorite: Favorite): Favorite[] {
  if (existing.some((f) => f.id === favorite.id)) return existing;
  return [...existing, favorite];
}
