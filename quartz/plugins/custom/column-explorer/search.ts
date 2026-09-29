import type { ExplorerModel, ExplorerNode } from "./model"

export interface SearchEntry {
  node: ExplorerNode
  path: string
  name: string
  searchable: string
}

// Models are immutable. Page navigation and column searches share this index;
// replacing the model also replaces the cache without retaining old models.
const indexes = new WeakMap<ExplorerModel, SearchEntry[]>()

// Treat common Turkish keyboard variants and circumflexes alike. Apostrophes
// do not split names, so both punctuated and unpunctuated queries work.
export function normalizeQuery(value: string): string {
  return value.toLocaleLowerCase("tr")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/ı/g, "i")
    .replace(/['’ʻʼ]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
}

export function createSearchIndex(model: ExplorerModel): SearchEntry[] {
  const cached = indexes.get(model)
  if (cached) return cached
  const result: SearchEntry[] = []
  for (const node of model.nodes.values()) {
    if (!node.id) continue
    const parents: string[] = []
    let parent = model.nodes.get(node.parent ?? "")
    while (parent?.id) {
      parents.unshift(parent.name)
      parent = model.nodes.get(parent.parent ?? "")
    }
    result.push({
      node,
      path: parents.length ? parents.join(" › ") : "Raflar",
      name: normalizeQuery(node.name),
      searchable: normalizeQuery(`${parents.join(" ")} ${node.name} ${node.id}`),
    })
  }
  indexes.set(model, result)
  return result
}

export function searchExplorer(index: SearchEntry[], query: string, folder = ""): SearchEntry[] {
  const normalized = normalizeQuery(query)
  if (!normalized) return []
  const words = normalized.split(" ")
  const rank = (entry: SearchEntry) => {
    if (entry.name === normalized) return 0
    if (entry.name.startsWith(normalized)) return 1
    if (words.every((word) => entry.name.includes(word))) return 2
    return 3
  }
  const collator = new Intl.Collator("tr", { numeric: true, sensitivity: "base" })
  return index.filter((entry) => (!folder || entry.node.id.startsWith(`${folder}/`))
    && words.every((word) => entry.searchable.includes(word)))
    .sort((a, b) => rank(a) - rank(b)
      || Number(b.node.folder) - Number(a.node.folder)
      || collator.compare(a.node.name, b.node.name)
      || collator.compare(a.path, b.path)
      || a.node.id.localeCompare(b.node.id))
}
