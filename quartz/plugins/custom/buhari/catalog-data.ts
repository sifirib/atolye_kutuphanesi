import { SKIP, visit } from "unist-util-visit"
import type { ProcessedContent } from "../../vfile"

export interface BuhariEntry {
  slug: string
  numbers: number[]
}

export function isBuhariSource(relativePath: unknown): relativePath is string {
  return (
    typeof relativePath === "string" &&
    /^Hadisler\/Buhari\/\d+\s*-\s*[^/]+\.md$/i.test(relativePath.replace(/\\/g, "/"))
  )
}

// Only published anchors are destinations. Repeated IDs remain unavailable
// rather than choosing one of their pages or deriving an ID from source text.
export function buildBuhariCatalog(content: readonly ProcessedContent[]): BuhariEntry[] {
  const destinations = new Map<number, string | null>()
  for (const [tree, file] of content) {
    if (!isBuhariSource(file.data.relativePath) || !file.data.slug) continue
    visit(tree, "element", (node) => {
      const classes: unknown = node.properties.className
      if (
        (Array.isArray(classes) && classes.includes("transclude")) ||
        (typeof classes === "string" && classes.split(/\s+/).includes("transclude"))
      )
        return SKIP
      const match = String(node.properties.id ?? "").match(/^buhari-([1-9]\d*)$/)
      if (!match) return
      const number = Number(match[1])
      if (!Number.isSafeInteger(number)) return
      destinations.set(number, destinations.has(number) ? null : file.data.slug!)
    })
  }

  const pages = new Map<string, number[]>()
  for (const [number, slug] of destinations) {
    if (slug === null) continue
    const numbers = pages.get(slug) ?? []
    numbers.push(number)
    pages.set(slug, numbers)
  }
  return [...pages]
    .map(([slug, numbers]) => ({ slug, numbers: numbers.sort((a, b) => a - b) }))
    .sort((a, b) => a.slug.localeCompare(b.slug, "tr", { numeric: true }))
}
