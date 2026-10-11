import { resolveSiteUrl } from "../site-url"
import type { SurahEntry } from "./catalog"

let request: Promise<SurahEntry[]> | undefined
export function loadQuranCatalog(): Promise<SurahEntry[]> {
  return request ??= fetch(resolveSiteUrl("static/quran-catalog.json"))
    .then(async (response) => {
      if (!response.ok) throw new Error("Sure listesi yüklenemedi")
      const entries: SurahEntry[] = await response.json()
      if (!Array.isArray(entries) || !entries.length) throw new Error("Sure listesi boş")
      return entries
    }).catch((error: unknown) => { request = undefined; throw error })
}
