import type { SavedQuote } from "@/types/quote";

export const SAVED_QUOTES_KEY = "pragma-works-saved-quotes-v1";
export const QUOTE_FOLIO_COUNTER_KEY = "pragma-works-quote-folio-counter-v1";

export function loadSavedQuotes(): SavedQuote[] {
  if (typeof window === "undefined") return [];

  const raw = window.localStorage.getItem(SAVED_QUOTES_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as SavedQuote[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    window.localStorage.removeItem(SAVED_QUOTES_KEY);
    return [];
  }
}

export function persistSavedQuotes(quotes: SavedQuote[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SAVED_QUOTES_KEY, JSON.stringify(quotes));
}

export function getNextQuoteFolio(): string {
  if (typeof window === "undefined") return "PW-000001";

  const current = Number(window.localStorage.getItem(QUOTE_FOLIO_COUNTER_KEY) || "0");
  const next = Number.isFinite(current) ? current + 1 : 1;
  window.localStorage.setItem(QUOTE_FOLIO_COUNTER_KEY, String(next));

  return `PW-${String(next).padStart(6, "0")}`;
}

export function getDefaultValidUntil(days = 15): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function sortQuotesByUpdatedAt(quotes: SavedQuote[]): SavedQuote[] {
  return [...quotes].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}
