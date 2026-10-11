import { resolveSiteUrl } from "../site-url"
import type { BuhariEntry } from "./catalog-data"

let request: Promise<BuhariEntry[]> | undefined

// Fetch only on first use; share the result across page transitions and retry
// failed requests instead of keeping a rejected promise in the cache.
export function loadBuhariCatalog(): Promise<BuhariEntry[]> {
  return (request ??= fetch(resolveSiteUrl("static/buhari-catalog.json"))
    .then(async (response) => {
      if (!response.ok) throw new Error("Buhari listesi yüklenemedi")
      const entries: BuhariEntry[] = await response.json()
      if (
        !Array.isArray(entries) ||
        !entries.length ||
        entries.some((entry) => typeof entry.slug !== "string" || !Array.isArray(entry.numbers))
      ) {
        throw new Error("Buhari listesi geçersiz")
      }
      return entries
    })
    .catch((error: unknown) => {
      request = undefined
      throw error
    }))
}
