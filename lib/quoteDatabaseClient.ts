import type { SavedQuote } from "@/types/quote";

export type QuoteDatabaseSyncResult = {
  ok: boolean;
  error?: string;
};

export async function syncQuoteToDatabase(
  quote: SavedQuote,
): Promise<QuoteDatabaseSyncResult> {
  try {
    const response = await fetch("/api/quotes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(quote),
    });

    const payload = (await response.json().catch(() => null)) as QuoteDatabaseSyncResult | null;

    if (!response.ok || !payload?.ok) {
      return {
        ok: false,
        error: payload?.error ?? "No se pudo sincronizar la cotización con BD.",
      };
    }

    return { ok: true };
  } catch (error) {
    console.warn("No se pudo sincronizar la cotización con BD.", error);
    return {
      ok: false,
      error: "No se pudo sincronizar la cotización con BD.",
    };
  }
}
