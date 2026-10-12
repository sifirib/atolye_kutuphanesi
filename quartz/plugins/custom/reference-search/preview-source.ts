// SourceCopy metadata uses the production origin; local previews may use a
// different origin or hosting prefix. Compare the actual canonical page path.
export function matchesPreviewSource(source: string | undefined, slug: string): boolean {
  if (!source || !slug) return false
  try {
    const path = decodeURIComponent(new URL(source).pathname).replace(/\/$/, "")
    const expected = `/${slug.replace(/^\/+|\/+$/g, "")}`
    return path === expected || path.endsWith(expected)
  } catch {
    return false
  }
}
