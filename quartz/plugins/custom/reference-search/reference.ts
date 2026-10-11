import type { BuhariEntry } from "../buhari/catalog-data"
import type { SurahEntry } from "../quran/catalog"

export interface ReferenceQuery {
  name: string
  number: number
  kind: "hadis" | "ayet"
}

export interface ReferenceResult {
  slug: string
  hash: string
  title: string
  kind: ReferenceQuery["kind"]
}

function nameKey(name: string): string {
  return name
    .toLocaleLowerCase("tr")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/ı/g, "i")
    .replace(/[\s'’ʻʼ-]/g, "")
}

export function parseReference(text: string): ReferenceQuery | undefined {
  // Parse the number before folding names: '-25' must never become '25'.
  const match = /^\s*(.+?)\s+([1-9]\d{0,3})\s*$/u.exec(text)
  if (!match) return
  const name = match[1].trim()
  if (!/^[\p{L}\p{M}][\p{L}\p{M}\s'’ʻʼ-]*$/u.test(name) || !/[\p{L}\p{M}'’ʻʼ]$/u.test(name)) return
  const key = nameKey(name)
  const kind = key === "buhari" ? "hadis" : "ayet"
  const number = Number(match[2])
  if (kind === "ayet" && number > 999) return
  return { name: key, number, kind }
}

export function findReference(
  query: ReferenceQuery,
  buhari: readonly BuhariEntry[] = [],
  surahs: readonly SurahEntry[] = [],
): ReferenceResult | undefined {
  if (query.kind === "hadis") {
    const matches = buhari.flatMap((entry) =>
      entry.numbers.filter((number) => number === query.number).map(() => entry),
    )
    if (matches.length !== 1) return
    return {
      slug: matches[0].slug,
      hash: `buhari-${query.number}`,
      title: `Buhari ${query.number}`,
      kind: "hadis",
    }
  }
  const matches = surahs.filter((surah) => nameKey(surah.name) === query.name)
  if (matches.length !== 1 || !matches[0].verses.includes(query.number)) return
  return {
    slug: matches[0].slug,
    hash: String(query.number),
    title: `${matches[0].name} ${query.number}`,
    kind: "ayet",
  }
}
